import fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleApiError } from './error-handler.js';
import { healthRoutes } from './health.js';

describe('Rate Limiting & Abuse Protection', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify();
    app.setErrorHandler(handleApiError);

    // Register rate limiter with strict low threshold for testing
    await app.register(rateLimit, {
      max: 2,
      timeWindow: '1 minute',
      allowList: (req) => {
        return req.url === '/health' || req.url === '/ready';
      },
      errorResponseBuilder: (_req, context) => ({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after}. Please try again later.`,
      }),
    });

    await app.register(healthRoutes);

    app.get('/api/test-rate-limit', async () => {
      return { ok: true };
    });
  });

  it('allows requests within the configured rate limit', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/api/test-rate-limit' });
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject({ method: 'GET', url: '/api/test-rate-limit' });
    expect(res2.statusCode).toBe(200);
  });

  it('rejects requests exceeding rate limit with HTTP 429 and RATE_LIMIT_EXCEEDED code', async () => {
    await app.inject({ method: 'GET', url: '/api/test-rate-limit' });
    await app.inject({ method: 'GET', url: '/api/test-rate-limit' });

    // 3rd request exceeds limit of 2
    const res3 = await app.inject({ method: 'GET', url: '/api/test-rate-limit' });
    expect(res3.statusCode).toBe(429);
    const body = res3.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.message).toContain('Rate limit exceeded');
  });

  it('exempts /health and /ready probes from rate limiting', async () => {
    // Send 5 rapid requests to /health (well beyond max: 2)
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ok');
    }
  });
});
