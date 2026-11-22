import { describe, expect, it } from 'vitest';
import {
  checkResendCooldown,
  consumeOtpAtomically,
  createOtpRecord,
  findActiveOtp,
  findOtpById,
  invalidatePendingOtps,
  MAX_OTP_ATTEMPTS,
  recordFailedAttempt,
} from './otp.repository.js';
import { createMockDb } from '../mock-db.js';

describe('OTP Persistence Repository', () => {
  const makeSampleRecord = (overrides = {}) => ({
    id: 'otp_01h8abc1234567890123456789',
    email: 'Owner@Example.COM',
    intent: 'owner_registration' as const,
    verifier: 'salt:hash123',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ...overrides,
  });

  it('createOtpRecord normalizes email and initializes pending record', async () => {
    const { db, emailOtps } = createMockDb();
    const created = await createOtpRecord(db, makeSampleRecord());

    expect(created.email).toBe('owner@example.com');
    expect(created.status).toBe('pending');
    expect(created.attempts).toBe(0);
    expect(created.consumedAt).toBeNull();
    expect(emailOtps).toHaveLength(1);
    expect(emailOtps[0].email).toBe('owner@example.com');
    expect(emailOtps[0].createdAt).toBeInstanceOf(Date);
    expect(emailOtps[0].expiresAt).toBeInstanceOf(Date);
  });

  it('findActiveOtp retrieves active OTP and isolates intents', async () => {
    const { db } = createMockDb();
    await createOtpRecord(
      db,
      makeSampleRecord({ email: 'owner@example.com', intent: 'owner_registration' })
    );

    const activeReg = await findActiveOtp(db, 'OWNER@EXAMPLE.COM', 'owner_registration');
    expect(activeReg).not.toBeNull();
    expect(activeReg?.intent).toBe('owner_registration');

    const activeLogin = await findActiveOtp(db, 'owner@example.com', 'owner_login');
    expect(activeLogin).toBeNull();
  });

  it('findActiveOtp rejects expired or consumed OTPs', async () => {
    const { db } = createMockDb();
    const expiredTime = new Date(Date.now() - 1000).toISOString();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_expired', expiresAt: expiredTime }));

    const foundExpired = await findActiveOtp(db, 'owner@example.com', 'owner_registration');
    expect(foundExpired).toBeNull();

    const futureTime = new Date(Date.now() + 60000).toISOString();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_consumed', expiresAt: futureTime }));
    await consumeOtpAtomically(db, 'otp_consumed');

    const foundConsumed = await findActiveOtp(db, 'owner@example.com', 'owner_registration');
    expect(foundConsumed).toBeNull();
  });

  it('findOtpById returns document by unique ID', async () => {
    const { db } = createMockDb();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_target_id' }));

    const found = await findOtpById(db, 'otp_target_id');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('otp_target_id');

    const missing = await findOtpById(db, 'nonexistent');
    expect(missing).toBeNull();
  });

  it('consumeOtpAtomically enforces single-use and sets consumedAt', async () => {
    const { db, emailOtps } = createMockDb();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_single_use' }));

    const firstConsume = await consumeOtpAtomically(db, 'otp_single_use');
    expect(firstConsume).not.toBeNull();
    expect(firstConsume?.status).toBe('consumed');
    expect(firstConsume?.consumedAt).toBeInstanceOf(Date);
    expect(emailOtps[0].status).toBe('consumed');

    const secondConsume = await consumeOtpAtomically(db, 'otp_single_use');
    expect(secondConsume).toBeNull();
  });

  it('consumeOtpAtomically prevents concurrent double-verification', async () => {
    const { db } = createMockDb();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_race_test' }));

    const [res1, res2] = await Promise.all([
      consumeOtpAtomically(db, 'otp_race_test'),
      consumeOtpAtomically(db, 'otp_race_test'),
    ]);

    const successCount = [res1, res2].filter(Boolean).length;
    expect(successCount).toBe(1);
  });

  it('consumeOtpAtomically rejects OTPs that reached MAX_OTP_ATTEMPTS', async () => {
    const { db } = createMockDb();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_max_att' }));

    for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
      await recordFailedAttempt(db, 'otp_max_att');
    }

    const consumed = await consumeOtpAtomically(db, 'otp_max_att');
    expect(consumed).toBeNull();
  });

  it('recordFailedAttempt increments counter and exhausts on max attempts', async () => {
    const { db, emailOtps } = createMockDb();
    await createOtpRecord(db, makeSampleRecord({ id: 'otp_attempts_test' }));

    const r1 = await recordFailedAttempt(db, 'otp_attempts_test');
    expect(r1.attempts).toBe(1);
    expect(r1.exhausted).toBe(false);

    await recordFailedAttempt(db, 'otp_attempts_test');
    await recordFailedAttempt(db, 'otp_attempts_test');
    await recordFailedAttempt(db, 'otp_attempts_test');
    const r5 = await recordFailedAttempt(db, 'otp_attempts_test');

    expect(r5.attempts).toBe(5);
    expect(r5.exhausted).toBe(true);
    expect(emailOtps[0].status).toBe('exhausted');
  });

  it('checkResendCooldown calculates remaining wait time accurately', async () => {
    const { db } = createMockDb();
    const now = new Date();

    const initial = await checkResendCooldown(db, 'owner@example.com', 'owner_registration', now);
    expect(initial.canResend).toBe(true);
    expect(initial.remainingCooldownSeconds).toBe(0);

    const createdRecord = await createOtpRecord(
      db,
      makeSampleRecord({ email: 'owner@example.com', intent: 'owner_registration' })
    );

    const immediate = await checkResendCooldown(
      db,
      'owner@example.com',
      'owner_registration',
      new Date(createdRecord.lastSentAt.getTime() + 10000)
    );
    expect(immediate.canResend).toBe(false);
    expect(immediate.remainingCooldownSeconds).toBeGreaterThan(0);
    expect(immediate.remainingCooldownSeconds).toBeLessThanOrEqual(50);

    const elapsed = await checkResendCooldown(
      db,
      'owner@example.com',
      'owner_registration',
      new Date(createdRecord.lastSentAt.getTime() + 70000)
    );
    expect(elapsed.canResend).toBe(true);
    expect(elapsed.remainingCooldownSeconds).toBe(0);
  });

  it('invalidatePendingOtps invalidates all active OTPs for email and intent', async () => {
    const { db, emailOtps } = createMockDb();
    emailOtps.push(
      {
        id: 'otp_1',
        email: 'owner@example.com',
        intent: 'owner_registration',
        verifier: 'v1',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        lastSentAt: new Date(),
        consumedAt: null,
      },
      {
        id: 'otp_2',
        email: 'owner@example.com',
        intent: 'owner_registration',
        verifier: 'v2',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        lastSentAt: new Date(),
        consumedAt: null,
      },
      {
        id: 'otp_3',
        email: 'other@example.com',
        intent: 'owner_registration',
        verifier: 'v3',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        lastSentAt: new Date(),
        consumedAt: null,
      },
      {
        id: 'otp_4',
        email: 'owner@example.com',
        intent: 'owner_login',
        verifier: 'v4',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        lastSentAt: new Date(),
        consumedAt: null,
      }
    );

    const count = await invalidatePendingOtps(db, 'owner@example.com', 'owner_registration');
    expect(count).toBe(2);

    expect(emailOtps.find((o) => o.id === 'otp_1')?.status).toBe('invalidated');
    expect(emailOtps.find((o) => o.id === 'otp_2')?.status).toBe('invalidated');
    expect(emailOtps.find((o) => o.id === 'otp_3')?.status).toBe('pending');
    expect(emailOtps.find((o) => o.id === 'otp_4')?.status).toBe('pending');
  });
});
