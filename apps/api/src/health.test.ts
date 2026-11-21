import fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { healthRoutes } from './health.js';

describe('API Health Routes', () => {
  it('returns status ok on /health liveness probe', async () => {
    const app = fastify();
    await app.register(healthRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('snapprint-api');
    await app.close();
  });

  it('returns database disabled on /ready when no client connected', async () => {
    const app = fastify();
    await app.register(healthRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('disabled');
    await app.close();
  });
});
