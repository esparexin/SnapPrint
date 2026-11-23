import { describe, expect, it } from 'vitest';
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  OTP_LENGTH,
} from '@snapprint/contracts';
import { createTestApp } from './auth-test-helper.js';

describe('Owner Registration & OTP Verification Handshake (Phase 4)', () => {
  const validPayload = {
    name: 'Alice Owner',
    email: 'Alice.Owner@Studio.com',
    phone: '+919876543210',
    termsAccepted: true,
    termsVersion: CURRENT_TERMS_VERSION,
    privacyPolicyAccepted: true,
    privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
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
    expect(body.message).toContain('If this email is eligible');
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
    expect(emailOtps[0].registrationData?.acceptedAt).toBeTruthy();

    await app.close();
  });

  it('POST /auth/register responds generically for existing users', async () => {
    const { app, users, emailService, emailOtps } = await createTestApp();
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

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).message).toContain('If this email is eligible');
    expect(emailService.getLastEmailFor('alice.owner@studio.com')).toBeUndefined();
    expect(emailOtps).toHaveLength(0);
    await app.close();
  });

  it('POST /auth/register responds generically during resend cooldown', async () => {
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
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.payload)).toEqual(JSON.parse(res1.payload));
    await app.close();
  });

  it('POST /auth/register uses the configured expiry in storage and email', async () => {
    const { app, emailService, emailOtps } = await createTestApp({ otpTtlMinutes: 5 });
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    const record = emailOtps[0];
    const sent = emailService.getLastEmailFor('alice.owner@studio.com');
    expect(record.expiresAt.getTime() - record.createdAt.getTime()).toBeGreaterThan(4 * 60 * 1000);
    expect(record.expiresAt.getTime() - record.createdAt.getTime()).toBeLessThanOrEqual(
      5 * 60 * 1000
    );
    expect(sent?.text).toContain('5 minutes');
    await app.close();
  });

  it('POST /auth/register requires explicit acceptance of both legal policies', async () => {
    const { app, emailOtps } = await createTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { ...validPayload, termsAccepted: false },
    });

    expect(res.statusCode).toBe(400);
    expect(emailOtps).toHaveLength(0);
    await app.close();
  });

  it('POST /auth/register/verify creates user, membership, issues cookie, and consumes OTP', async () => {
    const { app, emailService, users, memberships, emailOtps } = await createTestApp();

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
    expect(body.user.termsAcceptedVersion).toBe(CURRENT_TERMS_VERSION);
    expect(body.user.privacyPolicyAcceptedVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);
    expect(body.user.termsAcceptedAt).toBe(emailOtps[0].registrationData?.acceptedAt);
    expect(body.user.privacyPolicyAcceptedAt).toBe(emailOtps[0].registrationData?.acceptedAt);
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
    expect(retryRes.statusCode).toBe(400);
    expect(JSON.parse(retryRes.payload).code).toBe('INVALID_OR_EXPIRED_OTP');

    await app.close();
  });

  it('POST /auth/register/verify tracks failed attempts and exhausts after threshold', async () => {
    const { app, emailService } = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    const issuedCode = emailService
      .getLastEmailFor('alice.owner@studio.com')
      ?.text.match(new RegExp(`\\b\\d{${OTP_LENGTH}}\\b`))?.[0];
    if (!issuedCode) throw new Error('Expected registration OTP code');
    const wrongCode =
      issuedCode === '0'.repeat(OTP_LENGTH) ? '1'.repeat(OTP_LENGTH) : '0'.repeat(OTP_LENGTH);

    for (let i = 0; i < 4; i++) {
      const wrongRes = await app.inject({
        method: 'POST',
        url: '/auth/register/verify',
        payload: { email: 'alice.owner@studio.com', code: wrongCode },
      });
      expect(wrongRes.statusCode).toBe(400);
      expect(JSON.parse(wrongRes.payload).code).toBe('INVALID_OR_EXPIRED_OTP');
    }

    const exhaustRes = await app.inject({
      method: 'POST',
      url: '/auth/register/verify',
      payload: { email: 'alice.owner@studio.com', code: wrongCode },
    });
    expect(exhaustRes.statusCode).toBe(400);
    expect(JSON.parse(exhaustRes.payload).code).toBe('INVALID_OR_EXPIRED_OTP');

    await app.close();
  });

  it('POST /auth/register/verify rejects OTP records without valid acceptance evidence', async () => {
    const { app, emailService, emailOtps, users } = await createTestApp();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validPayload,
    });

    const code = emailService
      .getLastEmailFor('alice.owner@studio.com')
      ?.text.match(new RegExp(`\\b\\d{${OTP_LENGTH}}\\b`))?.[0];
    const registrationData = emailOtps[0]?.registrationData;
    if (!code || !registrationData) throw new Error('Expected registration OTP data');
    Object.assign(registrationData, { acceptedAt: undefined });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register/verify',
      payload: { email: 'alice.owner@studio.com', code },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe('INVALID_OR_EXPIRED_OTP');
    expect(users).toHaveLength(0);
    await app.close();
  });
});
