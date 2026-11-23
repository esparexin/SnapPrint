import { describe, expect, it } from 'vitest';
import { OTP_LENGTH } from '@snapprint/contracts';
import { createTestApp } from './auth-test-helper.js';

describe('Owner Passwordless Login with OTP (Phase 5)', () => {
  it('POST /auth/login/otp/request dispatches email OTP to existing active owner', async () => {
    const { app, users, emailService, emailOtps } = await createTestApp();
    users.push({
      id: 'user_owner',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      passwordHash: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: 'OWNER@STUDIO.COM' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('If this email is eligible');
    expect(body.email).toBe('owner@studio.com');
    expect(body.intent).toBe('owner_login');

    const sent = emailService.getLastEmailFor('owner@studio.com');
    expect(sent).toBeDefined();
    expect(sent?.subject).toContain('SnapPrint Login Code');
    expect(emailOtps).toHaveLength(1);
    expect(emailOtps[0].intent).toBe('owner_login');

    await app.close();
  });

  it('POST /auth/login/otp/request defends against email enumeration for non-existent users', async () => {
    const { app, emailService, emailOtps } = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'nonexistent@studio.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('If this email is eligible');

    // No email should be dispatched
    expect(emailService.getLastEmailFor('nonexistent@studio.com')).toBeUndefined();
    expect(emailOtps).toHaveLength(0);

    await app.close();
  });

  it('POST /auth/login/otp/request does not expose a resend cooldown for existing users', async () => {
    const { app, users, emailService } = await createTestApp();
    users.push({
      id: 'user_owner',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      passwordHash: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'owner@studio.com' },
    });
    const cooldownResponse = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'owner@studio.com' },
    });
    const unknownUserResponse = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'unknown@studio.com' },
    });

    expect(cooldownResponse.statusCode).toBe(200);
    expect(unknownUserResponse.statusCode).toBe(200);
    const cooldownBody = JSON.parse(cooldownResponse.payload);
    const unknownBody = JSON.parse(unknownUserResponse.payload);
    expect({ ...cooldownBody, email: unknownBody.email }).toEqual(unknownBody);
    expect(emailService.getSentEmails()).toHaveLength(1);
    await app.close();
  });

  it('POST /auth/login/otp/verify authenticates owner, sets session cookie and returns user', async () => {
    const { app, users, memberships, emailService } = await createTestApp();
    users.push({
      id: 'user_owner',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      passwordHash: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    memberships.push({
      userId: 'user_owner',
      studioId: 'studio_alpha',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'owner@studio.com' },
    });

    const lastEmail = emailService.getLastEmailFor('owner@studio.com');
    const code = lastEmail?.text.match(new RegExp(`\\b\\d{${OTP_LENGTH}}\\b`))![0];

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/verify',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: 'owner@studio.com', code },
    });

    expect(verifyRes.statusCode).toBe(200);
    const body = JSON.parse(verifyRes.payload);
    expect(body.user.email).toBe('owner@studio.com');
    expect(body.memberships).toHaveLength(1);

    const setCookie = verifyRes.headers['set-cookie'] as string;
    expect(setCookie).toContain('snapprint_op=');

    // Single-use check: replay returns 401
    const replayRes = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/verify',
      payload: { email: 'owner@studio.com', code },
    });
    expect(replayRes.statusCode).toBe(401);

    await app.close();
  });

  it('POST /auth/login/otp/verify rejects wrong code with generic 401', async () => {
    const { app, users } = await createTestApp();
    users.push({
      id: 'user_owner',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      passwordHash: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await app.inject({
      method: 'POST',
      url: '/auth/login/otp/request',
      payload: { email: 'owner@studio.com' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login/otp/verify',
      payload: { email: 'owner@studio.com', code: '9'.repeat(OTP_LENGTH) },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });
});
