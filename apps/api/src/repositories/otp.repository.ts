import { Db } from 'mongodb';
import { OtpIntent } from '@snapprint/contracts';
import {
  calculateOtpExpiry,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  getRemainingCooldownSeconds,
  isCooldownActive,
  isOtpExpired,
  MAX_OTP_VERIFY_ATTEMPTS,
} from '@snapprint/domain';

export const EMAIL_OTPS_COLLECTION = 'email_otps';
export const MAX_OTP_ATTEMPTS = MAX_OTP_VERIFY_ATTEMPTS;

export type OtpRecordStatus = 'pending' | 'consumed' | 'invalidated' | 'exhausted';

export interface EmailOtpRegistrationData {
  name: string;
  phone: string;
  termsVersion: string;
  privacyVersion: string;
}

export interface EmailOtpDocument {
  id: string;
  email: string;
  intent: OtpIntent;
  verifier: string;
  status: OtpRecordStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  expiresAt: Date;
  lastSentAt: Date;
  consumedAt: Date | null;
  registrationData?: EmailOtpRegistrationData | null;
}

export interface CreateOtpRecordInput {
  id: string;
  email: string;
  intent: OtpIntent;
  verifier: string;
  expiresAt?: Date | string;
  registrationData?: EmailOtpRegistrationData | null;
}

/**
 * Creates and persists a new OTP record. Atomically invalidates any prior
 * pending OTP records for the same normalized email and intent.
 */
export async function createOtpRecord(
  db: Db,
  input: CreateOtpRecordInput
): Promise<EmailOtpDocument> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date();
  const expiresAt = input.expiresAt
    ? input.expiresAt instanceof Date
      ? input.expiresAt
      : new Date(input.expiresAt)
    : calculateOtpExpiry(now);

  // Invalidate any previously pending OTPs for this email and intent
  await db
    .collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION)
    .updateMany(
      { email: normalizedEmail, intent: input.intent, status: 'pending' },
      { $set: { status: 'invalidated' } }
    );

  const doc: EmailOtpDocument = {
    id: input.id,
    email: normalizedEmail,
    intent: input.intent,
    verifier: input.verifier,
    status: 'pending',
    attempts: 0,
    maxAttempts: MAX_OTP_VERIFY_ATTEMPTS,
    createdAt: now,
    expiresAt,
    lastSentAt: now,
    consumedAt: null,
    registrationData: input.registrationData ?? null,
  };

  await db.collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION).insertOne(doc);
  return doc;
}

/**
 * Finds an active, unexpired, unconsumed OTP record for the given email and intent.
 * Enforces application-level expiration check as authoritative boundary.
 */
export async function findActiveOtp(
  db: Db,
  email: string,
  intent: OtpIntent,
  now: Date = new Date()
): Promise<EmailOtpDocument | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const doc = await db.collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION).findOne({
    email: normalizedEmail,
    intent,
    status: 'pending',
    consumedAt: null,
    expiresAt: { $gt: now },
    attempts: { $lt: MAX_OTP_VERIFY_ATTEMPTS },
  });

  if (!doc) {
    return null;
  }

  // Application-level authoritative check
  if (isOtpExpired(doc.expiresAt, now) || doc.attempts >= doc.maxAttempts) {
    return null;
  }

  return doc;
}

/**
 * Finds an OTP record by its unique ID.
 */
export async function findOtpById(db: Db, id: string): Promise<EmailOtpDocument | null> {
  return db.collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION).findOne({ id });
}

/**
 * Atomically verifies and consumes an active OTP record in a single database operation.
 * Prevents race conditions and double-spending across concurrent requests.
 */
export async function consumeOtpAtomically(
  db: Db,
  id: string,
  now: Date = new Date()
): Promise<EmailOtpDocument | null> {
  const result = await db.collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION).findOneAndUpdate(
    {
      id,
      status: 'pending',
      consumedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_OTP_VERIFY_ATTEMPTS },
    },
    {
      $set: {
        status: 'consumed',
        consumedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  return result ?? null;
}

/**
 * Atomically increments failed verification attempts for an OTP record.
 * Automatically marks the record as exhausted when reaching max attempts.
 */
export async function recordFailedAttempt(
  db: Db,
  id: string
): Promise<{ attempts: number; exhausted: boolean }> {
  const result = await db
    .collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION)
    .findOneAndUpdate(
      { id, status: 'pending' },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    );

  if (!result) {
    return { attempts: MAX_OTP_VERIFY_ATTEMPTS, exhausted: true };
  }

  const exhausted = result.attempts >= result.maxAttempts;
  if (exhausted && result.status !== 'exhausted') {
    await db
      .collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION)
      .updateOne({ id }, { $set: { status: 'exhausted' } });
  }

  return { attempts: result.attempts, exhausted };
}

/**
 * Evaluates whether a resend cooldown period is currently active for the email and intent.
 */
export async function checkResendCooldown(
  db: Db,
  email: string,
  intent: OtpIntent,
  now: Date = new Date()
): Promise<{ canResend: boolean; remainingCooldownSeconds: number }> {
  const normalizedEmail = email.trim().toLowerCase();

  const latest = await db
    .collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION)
    .find({ email: normalizedEmail, intent })
    .sort({ lastSentAt: -1 })
    .limit(1)
    .toArray();

  if (!latest || latest.length === 0) {
    return { canResend: true, remainingCooldownSeconds: 0 };
  }

  const lastSent = latest[0].lastSentAt;
  const cooldownActive = isCooldownActive(lastSent, DEFAULT_RESEND_COOLDOWN_SECONDS, now);
  const remainingSeconds = getRemainingCooldownSeconds(
    lastSent,
    DEFAULT_RESEND_COOLDOWN_SECONDS,
    now
  );

  return {
    canResend: !cooldownActive,
    remainingCooldownSeconds: remainingSeconds,
  };
}

/**
 * Marks all pending OTP records for a specific email and intent as invalidated.
 */
export async function invalidatePendingOtps(
  db: Db,
  email: string,
  intent: OtpIntent
): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db
    .collection<EmailOtpDocument>(EMAIL_OTPS_COLLECTION)
    .updateMany(
      { email: normalizedEmail, intent, status: 'pending' },
      { $set: { status: 'invalidated' } }
    );

  return result.modifiedCount;
}
