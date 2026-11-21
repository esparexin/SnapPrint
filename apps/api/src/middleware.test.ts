import fastify, { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleApiError } from './error-handler.js';
import { createRequireCustomerSession, sessionPlugin } from './plugins/session.js';
import { requireTenant, tenantPlugin } from './plugins/tenant.js';
import { signSessionToken } from './session-token.js';

describe('Fastify Tenant and Customer Session Middleware', () => {
  const sessionSecret = 'test-session-secret-key-that-has-sufficient-length-32chars!';
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify();
    app.setErrorHandler(handleApiError);
    await app.register(tenantPlugin);
    await app.register(sessionPlugin, { sessionSecret });

    const requireSession = createRequireCustomerSession(sessionSecret);

    // Tenant-only route
    app.get('/api/studio/:studioId/public', { preHandler: requireTenant }, async (req) => {
      return { studioId: req.studioId };
    });

    // Session-authenticated route with tenant isolation
    app.get(
      '/api/studio/:studioId/session',
      { preHandler: [requireTenant, requireSession] },
      async (req) => {
        return {
          studioId: req.studioId,
          session: req.customerSession,
        };
      }
    );
  });

  describe('Tenant Context Middleware (requireTenant)', () => {
    it('accepts valid studioId route parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/photo-express-1/public',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ studioId: 'photo-express-1' });
    });

    it('rejects invalid studioId format with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/INVALID_UPPERCASE/public',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('INVALID_TENANT_ID');
    });

    it('accepts valid studioId via x-studio-id header', async () => {
      app.get('/api/tenant-header-test', { preHandler: requireTenant }, async (req) => {
        return { studioId: req.studioId };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/tenant-header-test',
        headers: { 'x-studio-id': 'quick-prints-99' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ studioId: 'quick-prints-99' });
    });

    it('rejects missing tenant identification with 400', async () => {
      app.get('/api/missing-tenant', { preHandler: requireTenant }, async () => {
        return { ok: true };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/missing-tenant',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('MISSING_TENANT_ID');
    });
  });

  describe('Customer Session Middleware (requireCustomerSession)', () => {
    it('rejects requests without session token with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/studio-1/session',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('MISSING_SESSION_TOKEN');
    });

    it('accepts valid session token via Authorization Bearer header', async () => {
      const token = signSessionToken(
        {
          sessionId: 'session_1234567890123456',
          studioId: 'studio-1',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
        sessionSecret
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/studio-1/session',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.studioId).toBe('studio-1');
      expect(data.session.sessionId).toBe('session_1234567890123456');
    });

    it('enforces tenant isolation and rejects cross-tenant session access with 403', async () => {
      // Token belongs to studio-2, but route is requested for studio-1
      const token = signSessionToken(
        {
          sessionId: 'session_1234567890123456',
          studioId: 'studio-2',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
        sessionSecret
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/studio-1/session',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('TENANT_ISOLATION_VIOLATION');
    });

    it('rejects expired customer session token with 401', async () => {
      const expiredToken = signSessionToken(
        {
          sessionId: 'session_1234567890123456',
          studioId: 'studio-1',
          expiresAt: new Date(Date.now() - 5000).toISOString(),
        },
        sessionSecret
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/studio/studio-1/session',
        headers: { authorization: `Bearer ${expiredToken}` },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe('SESSION_EXPIRED');
    });
  });
});
