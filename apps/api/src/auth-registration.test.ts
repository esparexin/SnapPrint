import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';

describe('Owner Registration & OTP Verification Handshake (Phase 4)', () => {
  const validPayload = {
    name: 'Alice Owner',
    email: 'Alice.Owner@Studio.com',
    phone: '+919876543210',
    termsAccepted: true,
    termsVersion: '2026-v1',
    privacyPolicyAccepted: true,
    privacyVersion: '2026-v1',
  };

  it('POST /auth/register dispatches OTP, records cooldown, and stores pending record', async () => {
    const { app, emailService, emailOtps } = await createTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { origin: 'http://localhost:3000' },
      payload: validPayload,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.email).toBe('alice.owner@studio.com');
    expect(body.intent).toBe('owner_registration');
    expect(body.resendCooldownSeconds).toBe(60);

    // Verify email dispatch
    const sent = emailService.getLastEmailFor('alice.owner@studio.com');
    expect(sent).toBeDefined();
    expect(sent?.subject).toContain('SnapPrint Verification Code');

    // Verify DB persistence
    expect(emailOtps).toHaveLength(1);
    expect(emailOtps[0].email).toBe('alice.owner@studio.com');
    expect(emailOtps[0].status).toBe('pending');
    expect(emailOtps[0].registrationData?.name).toBe('Alice Owner');

    await app.close();
  });

  it('POST /auth/register rejects existing users with 409 Conflict', async () => {
    const { app, users } = await createTestApp();
    users.push({
      id: 'user_existing',
      email: 'alice.owner@studio.com',
      name: 'Existing',
      passwordHash: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).code).toBe('USER_ALREADY_EXISTS');
    await app.close();
  });

  it('POST /auth/register enforces resend cooldown with 429', async () => {
    const { app } = await createTestApp();

    const res1 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });
    expect(res1.statusCode).toBe(200);

    const res2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });
    expect(res2.statusCode).toBe(429);
    expect(JSON.parse(res2.payload).code).toBe('COOLDOWN_ACTIVE');
    await app.close();
  });

  it('POST /auth/register/verify creates user, membership, issues cookie, and consumes OTP', async () => {
    const { app, emailService, users, memberships } = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    const lastEmail = emailService.getLastEmailFor('alice.owner@studio.com');
    const codeMatch = lastEmail?.text.match(/\b\d{6}\b/);
    expect(codeMatch).not.toBeNull();
    const code = codeMatch![0];

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/register/verify',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: 'alice.owner@studio.com', code },
    });
    expect(verifyRes.statusCode).toBe(201);
    const body = JSON.parse(verifyRes.payload);
    expect(body.user.email).toBe('alice.owner@studio.com');
    expect(body.user.name).toBe('Alice Owner');
    expect(body.user.phone).toBe('+919876543210');
    expect(body.user.termsAcceptedVersion).toBe('2026-v1');
    expect(body.memberships).toHaveLength(1);
    expect(body.memberships[0].role).toBe('studio_owner');

    const setCookie = verifyRes.headers['set-cookie'] as string;
    expect(setCookie).toContain('snapprint_op=');
    expect(setCookie).toContain('HttpOnly');

    // DB state checks
    expect(users).toHaveLength(1);
    expect(users[0].passwordHash).toBeNull();
    expect(memberships).toHaveLength(1);

    // Double consumption prevention
    const retryRes = await app.inject({
      method: 'POST',
      url: '/auth/register/verify',
      payload: { email: 'alice.owner@studio.com', code },
    });
    expect(retryRes.statusCode).toBe(409); // User already exists now

    await app.close();
  });

  it('POST /auth/register/verify tracks failed attempts and exhausts after threshold', async () => {
    const { app } = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    for (let i = 0; i < 4; i++) {
      const wrongRes = await app.inject({
        method: 'POST',
        url: '/auth/register/verify',
        payload: { email: 'alice.owner@studio.com', code: '000000' },
      });
      expect(wrongRes.statusCode).toBe(400);
      expect(JSON.parse(wrongRes.payload).code).toBe('INVALID_OTP');
    }

    const exhaustRes = await app.inject({
      method: 'POST',
      url: '/auth/register/verify',
      payload: { email: 'alice.owner@studio.com', code: '000000' },
    });
    expect(exhaustRes.statusCode).toBe(400);
    expect(JSON.parse(exhaustRes.payload).code).toBe('OTP_EXHAUSTED');

    await app.close();
  });
});
