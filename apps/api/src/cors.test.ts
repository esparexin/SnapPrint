import { describe, expect, it } from 'vitest';
import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import {
  buildCorsOptions,
  CANONICAL_PRODUCTION_ORIGIN,
  isOriginAllowed,
  normalizeOrigin,
  parseAllowedOrigins,
} from './cors.js';
import { authRoutes } from './auth.js';
import {
  clearOperatorSessionCookie,
  getOperatorCookieName,
  issueOperatorSessionCookie,
} from './auth-utils.js';
import { createMockDb } from './mock-db.js';

async function createCorsTestApp(allowedOriginsStr?: string) {
  const app = fastify();
  const mock = createMockDb();
  await app.register(cors, buildCorsOptions(allowedOriginsStr));
  await app.register(fastifyCookie, { secret: 'test-secret-at-least-32-chars-long-abc' });
  await app.register(authRoutes, { db: mock.db });
  await app.ready();
  return { app, mock };
}

describe('CORS Architecture & Origin Normalization', () => {
  it('normalizes valid origins and rejects malformed/null strings', () => {
    expect(normalizeOrigin('https://snap.palnadu.dev')).toBe('https://snap.palnadu.dev');
    expect(normalizeOrigin('https://snap.palnadu.dev/')).toBe('https://snap.palnadu.dev');
    expect(normalizeOrigin('HTTPS://SNAP.PALNADU.DEV')).toBe('https://snap.palnadu.dev');
    expect(normalizeOrigin('http://localhost:3000/')).toBe('http://localhost:3000');
    expect(normalizeOrigin('null')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
  });

  it('parseAllowedOrigins guarantees canonical production origin and checks whitelist', () => {
    const origins = parseAllowedOrigins('http://localhost:3000');
    expect(origins).toContain(CANONICAL_PRODUCTION_ORIGIN);
    expect(origins).toContain('http://localhost:3000');
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed('null')).toBe(false);
    expect(isOriginAllowed('https://snap.palnadu.dev')).toBe(true);
    expect(isOriginAllowed('https://evil-phishing.com')).toBe(false);
  });
});

describe('Fastify CORS Integration & Route Behavior', () => {
  it('handles OPTIONS preflight from production origin with credentials & methods', async () => {
    const { app } = await createCorsTestApp('http://localhost:3000,https://snap.palnadu.dev');
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/auth/me',
      headers: {
        origin: 'https://snap.palnadu.dev',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://snap.palnadu.dev');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
    await app.close();
  });

  it('rejects OPTIONS preflight and GET from disallowed origin', async () => {
    const { app } = await createCorsTestApp('https://snap.palnadu.dev');
    const optRes = await app.inject({
      method: 'OPTIONS',
      url: '/auth/me',
      headers: { origin: 'https://evil.com', 'access-control-request-method': 'GET' },
    });
    expect(optRes.headers['access-control-allow-origin']).toBeUndefined();

    const getRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { origin: 'https://evil.com' },
    });
    expect(getRes.statusCode).toBe(401);
    expect(getRes.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });

  it('GET /auth/me without cookie returns 401 WITH CORS headers for allowed origin', async () => {
    const { app } = await createCorsTestApp('https://snap.palnadu.dev');
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { origin: 'https://snap.palnadu.dev' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.headers['access-control-allow-origin']).toBe('https://snap.palnadu.dev');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('GET /auth/me with valid session cookie returns 200 WITH CORS headers', async () => {
    const { app, mock } = await createCorsTestApp('https://snap.palnadu.dev');
    const userId = 'usr_cors_test_1';
    mock.users.push({
      id: userId,
      email: 'operator@snap.palnadu.dev',
      name: 'Test Operator',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const fakeReply = { setCookie: () => {} } as unknown as Parameters<
      typeof issueOperatorSessionCookie
    >[1];
    const { rawToken } = await issueOperatorSessionCookie(mock.db, fakeReply, userId, false);

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { origin: 'https://snap.palnadu.dev' },
      cookies: { snapprint_op: rawToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://snap.palnadu.dev');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(JSON.parse(res.payload).user.id).toBe(userId);
    await app.close();
  });

  it('CORS headers apply to 404 route responses for allowed origin', async () => {
    const { app } = await createCorsTestApp('https://snap.palnadu.dev');
    const res = await app.inject({
      method: 'GET',
      url: '/non-existent-endpoint',
      headers: { origin: 'https://snap.palnadu.dev' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.headers['access-control-allow-origin']).toBe('https://snap.palnadu.dev');
    await app.close();
  });
});

describe('Operator Cookie Security Attributes', () => {
  it('issues Secure and __Host- prefix in production mode', async () => {
    const mock = createMockDb();
    let header = '';
    const fakeReply = {
      setCookie: (_name: string, _val: string, opts: Record<string, unknown>) => {
        header = `secure=${opts.secure}; samesite=${opts.sameSite}`;
      },
    } as unknown as Parameters<typeof issueOperatorSessionCookie>[1];

    await issueOperatorSessionCookie(mock.db, fakeReply, 'user_123', true);
    expect(header).toContain('secure=true');
    expect(header).toContain('samesite=strict');
    expect(getOperatorCookieName(true)).toBe('__Host-snapprint_op');
  });

  it('issues non-secure cookie in development for local HTTP', async () => {
    const mock = createMockDb();
    let header = '';
    const fakeReply = {
      setCookie: (_name: string, _val: string, opts: Record<string, unknown>) => {
        header = `secure=${opts.secure}; samesite=${opts.sameSite}`;
      },
    } as unknown as Parameters<typeof issueOperatorSessionCookie>[1];

    await issueOperatorSessionCookie(mock.db, fakeReply, 'user_123', false);
    expect(header).toContain('secure=false');
    expect(header).toContain('samesite=strict');
    expect(getOperatorCookieName(false)).toBe('snapprint_op');
  });

  it('clears cookie with strict policy on logout', () => {
    let clearOpts: Record<string, unknown> = {};
    const fakeReply = {
      clearCookie: (_name: string, opts: Record<string, unknown>) => {
        clearOpts = opts;
      },
    } as unknown as Parameters<typeof clearOperatorSessionCookie>[0];

    clearOperatorSessionCookie(fakeReply, true);
    expect(clearOpts.sameSite).toBe('strict');
    expect(clearOpts.secure).toBe(true);

    clearOperatorSessionCookie(fakeReply, false);
    expect(clearOpts.sameSite).toBe('strict');
    expect(clearOpts.secure).toBe(false);
  });
});
