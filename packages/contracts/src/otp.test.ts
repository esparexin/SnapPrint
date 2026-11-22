import { describe, expect, it } from 'vitest';
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  LegalAcceptanceSchema,
  OtpCodeSchema,
  OtpIntentSchema,
  OtpVerificationStatusSchema,
  PhoneNumberSchema,
  RequestOwnerLoginOtpRequestSchema,
  RequestOwnerRegistrationOtpRequestSchema,
  RequestOtpResponseSchema,
  VerifyOwnerOtpRequestSchema,
} from './otp.js';

describe('OTP & Owner Identity Shared Contracts', () => {
  describe('OtpCodeSchema', () => {
    it('accepts valid 6-digit numeric codes including leading zeroes', () => {
      expect(OtpCodeSchema.parse('000123')).toBe('000123');
      expect(OtpCodeSchema.parse('999999')).toBe('999999');
      expect(OtpCodeSchema.parse(' 123456 ')).toBe('123456');
    });

    it('rejects invalid OTP formats', () => {
      expect(OtpCodeSchema.safeParse('12345').success).toBe(false); // 5 digits
      expect(OtpCodeSchema.safeParse('1234567').success).toBe(false); // 7 digits
      expect(OtpCodeSchema.safeParse('12345a').success).toBe(false); // alphanumeric
      expect(OtpCodeSchema.safeParse('-12345').success).toBe(false); // negative
      expect(OtpCodeSchema.safeParse('').success).toBe(false); // empty
    });
  });

  describe('PhoneNumberSchema', () => {
    it('accepts and normalizes valid E.164 phone numbers with country codes', () => {
      expect(PhoneNumberSchema.parse('+919876543210')).toBe('+919876543210');
      expect(PhoneNumberSchema.parse('+14155552671')).toBe('+14155552671');
      expect(PhoneNumberSchema.parse('+44 20 7946 0991')).toBe('+442079460991');
      expect(PhoneNumberSchema.parse('+91-98765-43210')).toBe('+919876543210');
    });

    it('rejects numbers missing country code or invalid format', () => {
      expect(PhoneNumberSchema.safeParse('9876543210').success).toBe(false); // missing '+'
      expect(PhoneNumberSchema.safeParse('+0123456789').success).toBe(false); // leading zero country code
      expect(PhoneNumberSchema.safeParse('+').success).toBe(false);
      expect(PhoneNumberSchema.safeParse('not-a-number').success).toBe(false);
    });
  });

  describe('LegalAcceptanceSchema', () => {
    it('validates legal policy acceptance with versions and timestamps', () => {
      const valid = {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        acceptedAt: '2026-11-22T00:00:00.000Z',
      };
      const parsed = LegalAcceptanceSchema.parse(valid);
      expect(parsed.termsVersion).toBe(CURRENT_TERMS_VERSION);
      expect(parsed.privacyVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);
    });

    it('rejects invalid timestamps or missing versions', () => {
      expect(
        LegalAcceptanceSchema.safeParse({
          termsVersion: '',
          privacyVersion: '2026.1',
          acceptedAt: '2026-11-22T00:00:00.000Z',
        }).success
      ).toBe(false);

      expect(
        LegalAcceptanceSchema.safeParse({
          termsVersion: '2026.1',
          privacyVersion: '2026.1',
          acceptedAt: 'invalid-date',
        }).success
      ).toBe(false);
    });
  });

  describe('RequestOwnerRegistrationOtpRequestSchema', () => {
    it('validates owner registration request with normalized email and phone', () => {
      const valid = {
        name: '  Kalyan V Medaboina  ',
        email: '  Owner@SnapPrint.COM  ',
        phone: '+91 98765 43210',
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      };

      const parsed = RequestOwnerRegistrationOtpRequestSchema.parse(valid);
      expect(parsed.name).toBe('Kalyan V Medaboina');
      expect(parsed.email).toBe('owner@snapprint.com');
      expect(parsed.phone).toBe('+919876543210');
    });

    it('rejects missing or invalid fields in registration request', () => {
      expect(
        RequestOwnerRegistrationOtpRequestSchema.safeParse({
          name: '',
          email: 'valid@example.com',
          phone: '+919876543210',
          termsVersion: '2026.1',
          privacyVersion: '2026.1',
        }).success
      ).toBe(false);

      expect(
        RequestOwnerRegistrationOtpRequestSchema.safeParse({
          name: 'Owner',
          email: 'invalid-email',
          phone: '+919876543210',
          termsVersion: '2026.1',
          privacyVersion: '2026.1',
        }).success
      ).toBe(false);
    });
  });

  describe('RequestOwnerLoginOtpRequestSchema', () => {
    it('validates login OTP request with normalized email', () => {
      const parsed = RequestOwnerLoginOtpRequestSchema.parse({
        email: '  OPERATOR@STUDIO.COM  ',
      });
      expect(parsed.email).toBe('operator@studio.com');
    });

    it('rejects malformed email for login OTP request', () => {
      expect(RequestOwnerLoginOtpRequestSchema.safeParse({ email: 'bad-email' }).success).toBe(
        false
      );
    });
  });

  describe('VerifyOwnerOtpRequestSchema', () => {
    it('validates OTP verification payload for registration and login intents', () => {
      const reg = VerifyOwnerOtpRequestSchema.parse({
        email: 'owner@studio.com',
        otp: '123456',
        intent: 'owner_registration',
      });
      expect(reg.intent).toBe('owner_registration');

      const login = VerifyOwnerOtpRequestSchema.parse({
        email: 'owner@studio.com',
        otp: '001234',
        intent: 'owner_login',
      });
      expect(login.intent).toBe('owner_login');
      expect(login.otp).toBe('001234');
    });

    it('rejects invalid intents or non-6-digit OTPs', () => {
      expect(
        VerifyOwnerOtpRequestSchema.safeParse({
          email: 'owner@studio.com',
          otp: '123456',
          intent: 'unsupported_intent',
        }).success
      ).toBe(false);

      expect(
        VerifyOwnerOtpRequestSchema.safeParse({
          email: 'owner@studio.com',
          otp: '123',
          intent: 'owner_login',
        }).success
      ).toBe(false);
    });
  });

  describe('RequestOtpResponseSchema', () => {
    it('validates safe response contract without exposing OTP or hashes', () => {
      const response = {
        statusCode: 200,
        message: 'If the email is valid, a verification code has been dispatched.',
        cooldownSeconds: 60,
        expiresInSeconds: 600,
      };

      const parsed = RequestOtpResponseSchema.parse(response);
      expect(parsed.cooldownSeconds).toBe(60);
      expect(parsed.expiresInSeconds).toBe(600);
      expect((parsed as Record<string, unknown>).otp).toBeUndefined();
      expect((parsed as Record<string, unknown>).hash).toBeUndefined();
    });
  });

  describe('OtpVerificationStatusSchema & OtpIntentSchema', () => {
    it('supports defined statuses and intents', () => {
      expect(OtpIntentSchema.safeParse('owner_registration').success).toBe(true);
      expect(OtpIntentSchema.safeParse('owner_login').success).toBe(true);
      expect(OtpIntentSchema.safeParse('customer_login').success).toBe(false);

      expect(OtpVerificationStatusSchema.safeParse('verified').success).toBe(true);
      expect(OtpVerificationStatusSchema.safeParse('invalid_code').success).toBe(true);
      expect(OtpVerificationStatusSchema.safeParse('expired').success).toBe(true);
      expect(OtpVerificationStatusSchema.safeParse('max_attempts_exceeded').success).toBe(true);
      expect(OtpVerificationStatusSchema.safeParse('cooldown_active').success).toBe(true);
    });
  });
});
