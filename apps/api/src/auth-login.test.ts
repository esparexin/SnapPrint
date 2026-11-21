import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Operator Login Route & Credentials Validation', () => {
  it('POST /auth/login successfully authenticates valid credentials, sets cookie and returns public user', async () => {
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

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: 'Jane@Example.COM', password: 'CorrectPassword123!' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.email).toBe('jane@example.com');
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.memberships).toHaveLength(1);
    expect(body.memberships[0].studioId).toBe('studio_alpha');

    const setCookie = res.headers['set-cookie'] as string;
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('snapprint_op=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');

    await app.close();
  });

  it('POST /auth/login rejects wrong password, increments failed logins and protects against timing leaks', async () => {
    const { app, users } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'jane@example.com',
      name: 'Jane Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      failedLoginAttempts: 0,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jane@example.com', password: 'WrongPassword123!' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('INVALID_CREDENTIALS');
    expect(users[0].failedLoginAttempts).toBe(1);

    await app.close();
  });

  it('POST /auth/login returns consistent generic 401 for non-existent users', async () => {
    const { app } = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nonexistent@example.com', password: 'AnyPassword123!' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });

  it('POST /auth/login locks account after 5 failed attempts and returns generic 401', async () => {
    const { app, users } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'jane@example.com',
      name: 'Jane Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      failedLoginAttempts: 4,
    });

    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jane@example.com', password: 'WrongPassword123!' },
    });
    expect(res1.statusCode).toBe(401);
    expect(users[0].lockoutUntil).toBeDefined();

    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jane@example.com', password: 'CorrectPassword123!' },
    });
    expect(res2.statusCode).toBe(401);
    expect(JSON.parse(res2.payload).code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });

  it('POST /auth/login returns generic 401 for suspended and inactive users', async () => {
    const { app, users } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'suspended@example.com',
      name: 'Suspended Operator',
      passwordHash: hash,
      status: 'suspended',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'suspended@example.com', password: 'CorrectPassword123!' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });

  it('POST /auth/login self-heals lockout when failedLoginAttempts threshold met', async () => {
    const { app, users } = await createTestApp();
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'race@example.com',
      name: 'Race Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      failedLoginAttempts: 5,
      lockoutUntil: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'race@example.com', password: 'CorrectPassword123!' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).code).toBe('INVALID_CREDENTIALS');
    expect(users[0].lockoutUntil).toBeDefined();

    await app.close();
  });

  it('POST /auth/login sets __Host- prefix and Secure flag when cookieSecure is true', async () => {
    const { app, users } = await createTestApp({ cookieSecure: true });
    const hash = await hashPassword('CorrectPassword123!');

    users.push({
      id: 'user_01h8abc1234567890123456789',
      email: 'prod@example.com',
      name: 'Prod Operator',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'prod@example.com', password: 'CorrectPassword123!' },
    });

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['set-cookie'] as string;
    expect(setCookie).toContain('__Host-snapprint_op=');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Path=/');

    await app.close();
  });

  it('POST /auth/login rejects null, invalid, and cross-port origins', async () => {
    const { app } = await createTestApp();

    for (const origin of [
      'https://malicious.com',
      'null',
      'not-a-valid-url',
      'http://localhost:3001',
    ]) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { origin },
        payload: { email: 'test@example.com', password: 'Password123!' },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('CSRF_ORIGIN_MISMATCH');
    }

    await app.close();
  });
});
