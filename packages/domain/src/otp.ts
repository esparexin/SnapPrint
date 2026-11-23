import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  DEFAULT_OTP_TTL_MINUTES,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  OTP_LENGTH,
} from '@snapprint/contracts';

export {
  DEFAULT_OTP_TTL_MINUTES,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  OTP_LENGTH,
} from '@snapprint/contracts';
export const MAX_OTP_VERIFY_ATTEMPTS = 5;
export const OTP_SALT_BYTES = 16;

const OTP_REGEX = new RegExp(`^\\d{${OTP_LENGTH}}$`);
const OTP_VERIFIER_REGEX = /^\$otp\$v1\$([a-f0-9]{32})\$([a-f0-9]{64})$/i;

/**
 * Generates a cryptographically secure numeric OTP using the shared contract length.
 * Preserves leading zeroes using string padding.
 * Uses node:crypto.randomInt (uniformly distributed, zero modulo bias).
 */
export function generateSecureOtp(length: number = OTP_LENGTH): string {
  if (length !== OTP_LENGTH) {
    throw new Error(`Unsupported OTP length: expected ${OTP_LENGTH}`);
  }
  const codeInt = randomInt(0, 10 ** OTP_LENGTH);
  return codeInt.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hashes a plaintext OTP code with a cryptographic salt into a protected verifier.
 * Format: $otp$v1$<salt_hex>$<hmac_sha256_hex>
 * Plaintext OTP is NEVER stored.
 * Optional context (e.g. normalized email or intent) binds the verifier to the specific user/intent.
 */
export function hashOtpVerifier(
  otp: string,
  salt: Buffer = randomBytes(OTP_SALT_BYTES),
  context?: string
): string {
  if (typeof otp !== 'string' || !OTP_REGEX.test(otp)) {
    throw new Error(`Invalid OTP format: must be a ${OTP_LENGTH}-digit numeric string`);
  }

  if (salt.length !== OTP_SALT_BYTES) {
    throw new Error(`Salt must be exactly ${OTP_SALT_BYTES} bytes`);
  }

  const hmac = createHmac('sha256', salt);
  if (context) {
    hmac.update(context.trim().toLowerCase());
    hmac.update(':');
  }
  hmac.update(otp);
  const digestHex = hmac.digest('hex');

  return `$otp$v1$${salt.toString('hex')}$${digestHex}`;
}

/**
 * Verifies a candidate OTP against a stored verifier using constant-time comparison.
 * Safely returns false on malformed verifiers, incorrect codes, or mismatched contexts without throwing.
 */
export function verifyOtp(candidateOtp: string, storedVerifier: string, context?: string): boolean {
  if (typeof candidateOtp !== 'string' || typeof storedVerifier !== 'string') {
    return false;
  }

  if (!OTP_REGEX.test(candidateOtp)) {
    return false;
  }

  const match = storedVerifier.match(OTP_VERIFIER_REGEX);
  if (!match) {
    return false;
  }

  const [, saltHex, expectedHashHex] = match;

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(expectedHashHex, 'hex');

    if (salt.length !== OTP_SALT_BYTES || expectedHash.length !== 32) {
      return false;
    }

    const hmac = createHmac('sha256', salt);
    if (context) {
      hmac.update(context.trim().toLowerCase());
      hmac.update(':');
    }
    hmac.update(candidateOtp);
    const computedHash = hmac.digest();

    return timingSafeEqual(computedHash, expectedHash);
  } catch {
    return false;
  }
}

/**
 * Calculates the expiration timestamp for an OTP.
 */
export function calculateOtpExpiry(
  createdAt: Date = new Date(),
  ttlMinutes: number = DEFAULT_OTP_TTL_MINUTES
): Date {
  return new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);
}

/**
 * Determines whether an OTP expiration timestamp has passed.
 */
export function isOtpExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const expiryTime =
    expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) {
    return true;
  }
  return now.getTime() >= expiryTime;
}

/**
 * Determines whether a resend cooldown period is still active.
 */
export function isCooldownActive(
  lastSentAt: Date | string,
  cooldownSeconds: number = DEFAULT_RESEND_COOLDOWN_SECONDS,
  now: Date = new Date()
): boolean {
  const sentTime =
    lastSentAt instanceof Date ? lastSentAt.getTime() : new Date(lastSentAt).getTime();
  if (Number.isNaN(sentTime)) {
    return false;
  }
  return now.getTime() < sentTime + cooldownSeconds * 1000;
}

/**
 * Returns the remaining cooldown duration in seconds, or 0 if expired.
 */
export function getRemainingCooldownSeconds(
  lastSentAt: Date | string,
  cooldownSeconds: number = DEFAULT_RESEND_COOLDOWN_SECONDS,
  now: Date = new Date()
): number {
  const sentTime =
    lastSentAt instanceof Date ? lastSentAt.getTime() : new Date(lastSentAt).getTime();
  if (Number.isNaN(sentTime)) {
    return 0;
  }
  const remainingMs = sentTime + cooldownSeconds * 1000 - now.getTime();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}
