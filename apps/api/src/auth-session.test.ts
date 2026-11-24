import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Operator Session Lifecycle & /auth/me Profile', () => {
  it('GET /auth/me returns current authenticated operator profile and memberships', async () => {
    const { app, users, memberships } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'jane@example.com',
      name: 'Jane Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    memberships.push({
      userId: 'user_01h8abc1234567890123456789',
      studioId: 'studio_alpha',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jane@example.com', password: 'CorrectPassword123!' },
    });
    const cookie = loginRes.cookies[0];

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.user.id).toBe('user_01h8abc1234567890123456789');
    expect(body.user.name).toBe('Jane Operator');
    expect(body.memberships).toHaveLength(1);

    await app.close();
  });

  it('GET /auth/me rejects requests without cookie or with bearer token fallback', async () => {
    const { app } = await createTestApp();

    const noCookie = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(noCookie.statusCode).toBe(401);
    expect(JSON.parse(noCookie.payload).code).toBe('UNAUTHORIZED');

    const bearerFallback = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer some_token_attempt' },
    });
    expect(bearerFallback.statusCode).toBe(401);
    expect(JSON.parse(bearerFallback.payload).code).toBe('UNAUTHORIZED');

    await app.close();
  });

  it('POST /auth/logout revokes session in database, clears cookie and is idempotent', async () => {
    const { app, users, sessions } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'jane@example.com',
      name: 'Jane Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jane@example.com', password: 'CorrectPassword123!' },
    });
    const cookie = loginRes.cookies[0];
    expect(sessions[0].status).toBe('active');

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(sessions[0].status).toBe('revoked');

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { [cookie.name]: cookie.value },
    });
    expect(meRes.statusCode).toBe(401);
    expect(JSON.parse(meRes.payload).code).toBe('INVALID_SESSION');

    const logoutAgain = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { [cookie.name]: cookie.value },
    });
    expect(logoutAgain.statusCode).toBe(200);

    await app.close();
  });

  it('POST /auth/logout with cookieSecure: true clears __Host- cookie with Secure and None', async () => {
    const { app } = await createTestApp({ cookieSecure: true });

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { '__Host-snapprint_op': 'some_token' },
    });

    expect(logoutRes.statusCode).toBe(200);
    const setCookie = logoutRes.headers['set-cookie'] as string;
    expect(setCookie).toContain('__Host-snapprint_op=');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=None');
    expect(setCookie).toContain('Path=/');

    await app.close();
  });
});
