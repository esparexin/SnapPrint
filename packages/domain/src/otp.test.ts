import { describe, expect, it } from 'vitest';
import {
  calculateOtpExpiry,
  DEFAULT_OTP_TTL_MINUTES,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  generateSecureOtp,
  getRemainingCooldownSeconds,
  hashOtpVerifier,
  isCooldownActive,
  isOtpExpired,
  MAX_OTP_VERIFY_ATTEMPTS,
  OTP_LENGTH,
  OTP_SALT_BYTES,
  verifyOtp,
} from './otp.js';

describe('OTP Cryptographic Domain SSOT', () => {
  describe('generateSecureOtp', () => {
    it('generates a 6-digit numeric string', () => {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(OTP_LENGTH);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('generates uniformly distributed codes with preserved leading zeroes over repeated samples', () => {
      const codes = new Set<string>();

      // 100 iterations to verify format consistency and uniqueness
      for (let i = 0; i < 100; i++) {
        const otp = generateSecureOtp();
        expect(otp).toHaveLength(6);
        expect(/^\d{6}$/.test(otp)).toBe(true);
        codes.add(otp);
      }

      // Strong randomness should produce nearly 100 distinct values
      expect(codes.size).toBeGreaterThan(90);
    });

    it('throws when requesting unsupported length', () => {
      expect(() => generateSecureOtp(4)).toThrow('Unsupported OTP length');
      expect(() => generateSecureOtp(8)).toThrow('Unsupported OTP length');
    });
  });

  describe('hashOtpVerifier', () => {
    it('hashes a plaintext OTP into a protected modular verifier string', () => {
      const otp = '012345';
      const verifier = hashOtpVerifier(otp);

      expect(typeof verifier).toBe('string');
      expect(verifier.startsWith('$otp$v1$')).toBe(true);

      const parts = verifier.split('$');
      // ['', 'otp', 'v1', '<saltHex>', '<hashHex>']
      expect(parts).toHaveLength(5);
      expect(parts[1]).toBe('otp');
      expect(parts[2]).toBe('v1');
      expect(parts[3]).toHaveLength(OTP_SALT_BYTES * 2); // 16 bytes = 32 hex chars
      expect(parts[4]).toHaveLength(64); // SHA-256 = 32 bytes = 64 hex chars

      // Plaintext OTP must NEVER appear anywhere in the verifier
      expect(verifier.includes(otp)).toBe(false);
    });

    it('produces distinct verifiers for the same OTP with random salts', () => {
      const otp = '987654';
      const verifier1 = hashOtpVerifier(otp);
      const verifier2 = hashOtpVerifier(otp);

      expect(verifier1).not.toBe(verifier2);
    });

    it('incorporates contextual binding (e.g. normalized email) into the hash', () => {
      const otp = '654321';
      const salt = Buffer.alloc(OTP_SALT_BYTES, 0xaa);

      const verifierWithContext1 = hashOtpVerifier(otp, salt, 'owner@studio.com');
      const verifierWithContext2 = hashOtpVerifier(otp, salt, 'other@studio.com');
      const verifierWithoutContext = hashOtpVerifier(otp, salt);

      expect(verifierWithContext1).not.toBe(verifierWithContext2);
      expect(verifierWithContext1).not.toBe(verifierWithoutContext);
    });

    it('throws when hashing invalid OTP format or invalid salt length', () => {
      expect(() => hashOtpVerifier('12345')).toThrow('Invalid OTP format');
      expect(() => hashOtpVerifier('abcdef')).toThrow('Invalid OTP format');
      expect(() => hashOtpVerifier('')).toThrow('Invalid OTP format');
      expect(() => hashOtpVerifier('123456', Buffer.alloc(8))).toThrow('Salt must be exactly');
    });
  });

  describe('verifyOtp', () => {
    it('successfully verifies candidate OTP against stored verifier', () => {
      const otp = '045678';
      const verifier = hashOtpVerifier(otp);

      expect(verifyOtp(otp, verifier)).toBe(true);
    });

    it('successfully verifies candidate OTP with matching context', () => {
      const otp = '789012';
      const context = 'owner@snapprint.com';
      const verifier = hashOtpVerifier(otp, undefined, context);

      expect(verifyOtp(otp, verifier, context)).toBe(true);
      expect(verifyOtp(otp, verifier, 'wrong@snapprint.com')).toBe(false);
      expect(verifyOtp(otp, verifier)).toBe(false);
    });

    it('rejects incorrect OTP candidate', () => {
      const otp = '112233';
      const verifier = hashOtpVerifier(otp);

      expect(verifyOtp('998877', verifier)).toBe(false);
      expect(verifyOtp('112234', verifier)).toBe(false);
    });

    it('safely rejects malformed or tampered verifiers without throwing', () => {
      const otp = '123456';
      const validVerifier = hashOtpVerifier(otp);

      expect(verifyOtp(otp, 'not-a-verifier')).toBe(false);
      expect(verifyOtp(otp, '$scrypt$v1$invalid$hash')).toBe(false);
      expect(verifyOtp(otp, '$otp$v2$unsupported$hash')).toBe(false);
      expect(verifyOtp(otp, '')).toBe(false);
      expect(verifyOtp('', validVerifier)).toBe(false);

      // Tamper with salt
      const parts = validVerifier.split('$');
      const tamperedSalt = '0'.repeat(32);
      const tamperedSaltVerifier = `$otp$v1$${tamperedSalt}$${parts[4]}`;
      expect(verifyOtp(otp, tamperedSaltVerifier)).toBe(false);

      // Tamper with hash digest
      const tamperedHash = 'f'.repeat(64);
      const tamperedHashVerifier = `$otp$v1$${parts[3]}$${tamperedHash}`;
      expect(verifyOtp(otp, tamperedHashVerifier)).toBe(false);
    });

    it('safely rejects non-string inputs', () => {
      expect(verifyOtp(null as unknown as string, 'verifier')).toBe(false);
      expect(verifyOtp('123456', null as unknown as string)).toBe(false);
      expect(verifyOtp(undefined as unknown as string, undefined as unknown as string)).toBe(false);
    });
  });

  describe('Lifecycle & Expiry Boundaries', () => {
    it('calculates expiry timestamp with default 10 minutes TTL', () => {
      const now = new Date('2026-11-22T10:00:00.000Z');
      const expiry = calculateOtpExpiry(now, DEFAULT_OTP_TTL_MINUTES);

      expect(expiry.toISOString()).toBe('2026-11-22T10:10:00.000Z');
    });

    it('evaluates isOtpExpired accurately', () => {
      const expiry = new Date('2026-11-22T10:10:00.000Z');

      // Before expiry
      expect(isOtpExpired(expiry, new Date('2026-11-22T10:09:59.000Z'))).toBe(false);
      // At exact expiry
      expect(isOtpExpired(expiry, new Date('2026-11-22T10:10:00.000Z'))).toBe(true);
      // After expiry
      expect(isOtpExpired(expiry, new Date('2026-11-22T10:10:01.000Z'))).toBe(true);

      // Invalid date string
      expect(isOtpExpired('invalid-date')).toBe(true);
    });

    it('enforces resend cooldown boundaries', () => {
      const sentAt = new Date('2026-11-22T10:00:00.000Z');

      // 30 seconds after send -> cooldown active
      const now30s = new Date('2026-11-22T10:00:30.000Z');
      expect(isCooldownActive(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now30s)).toBe(true);
      expect(getRemainingCooldownSeconds(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now30s)).toBe(30);

      // 60 seconds after send -> cooldown expired
      const now60s = new Date('2026-11-22T10:01:00.000Z');
      expect(isCooldownActive(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now60s)).toBe(false);
      expect(getRemainingCooldownSeconds(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now60s)).toBe(0);

      // 90 seconds after send -> cooldown expired
      const now90s = new Date('2026-11-22T10:01:30.000Z');
      expect(isCooldownActive(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now90s)).toBe(false);
      expect(getRemainingCooldownSeconds(sentAt, DEFAULT_RESEND_COOLDOWN_SECONDS, now90s)).toBe(0);
    });

    it('exports expected security threshold constants', () => {
      expect(MAX_OTP_VERIFY_ATTEMPTS).toBe(5);
      expect(DEFAULT_RESEND_COOLDOWN_SECONDS).toBe(60);
      expect(DEFAULT_OTP_TTL_MINUTES).toBe(10);
    });
  });
});
