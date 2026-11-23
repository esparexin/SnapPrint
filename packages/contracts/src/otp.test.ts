import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OTP_TTL_MINUTES,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  createOtpDispatchResponse,
  LegalAcceptanceSchema,
  OTP_DISPATCH_MESSAGE,
  OTP_LENGTH,
  OtpCodeSchema,
  OtpDispatchResponseSchema,
  OtpIntentSchema,
  PhoneNumberSchema,
  RequestOwnerLoginOtpRequestSchema,
  RequestOwnerRegistrationOtpRequestSchema,
  VerifyOwnerLoginOtpRequestSchema,
  VerifyOwnerRegistrationOtpRequestSchema,
  VerifyOwnerOtpRequestSchema,
} from './otp.js';

describe('OTP & Owner Identity Shared Contracts', () => {
  describe('OtpCodeSchema', () => {
    it(`accepts valid ${OTP_LENGTH}-digit numeric codes including leading zeroes`, () => {
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

    it('rejects versions other than the current terms and privacy policies', () => {
      expect(
        LegalAcceptanceSchema.safeParse({
          termsVersion: 'older',
          privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
          acceptedAt: '2026-11-22T00:00:00.000Z',
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
        termsAccepted: true,
        privacyPolicyAccepted: true,
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
          termsAccepted: false,
          privacyPolicyAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        }).success
      ).toBe(false);

      expect(
        RequestOwnerRegistrationOtpRequestSchema.safeParse({
          name: 'Owner',
          email: 'invalid-email',
          phone: '+919876543210',
          termsAccepted: true,
          privacyPolicyAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
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
    it('is the shared request schema for registration and login verification', () => {
      const request = {
        email: 'owner@studio.com',
        code: '001234',
      };
      expect(VerifyOwnerOtpRequestSchema.parse(request).code).toBe('001234');
      expect(VerifyOwnerRegistrationOtpRequestSchema.parse(request).code).toBe('001234');
      expect(VerifyOwnerLoginOtpRequestSchema.parse(request).code).toBe('001234');
    });

    it('rejects non-six-digit OTPs', () => {
      expect(
        VerifyOwnerOtpRequestSchema.safeParse({
          email: 'owner@studio.com',
          code: '123',
        }).success
      ).toBe(false);
    });
  });

  describe('OTP dispatch responses', () => {
    it('uses the same generic response shape without fabricated delivery or expiry details', () => {
      const response = createOtpDispatchResponse('owner@studio.com', 'owner_login');
      expect(response.message).toBe(OTP_DISPATCH_MESSAGE);
      expect(response.retryAfterSeconds).toBe(DEFAULT_RESEND_COOLDOWN_SECONDS);
      expect(response).not.toHaveProperty('success');
      expect(response).not.toHaveProperty('expiresAt');
      expect(OtpDispatchResponseSchema.parse(response)).toEqual(response);
    });
  });

  describe('OTP intent and defaults', () => {
    it('exports the supported intents and shared timing values', () => {
      expect(OtpIntentSchema.safeParse('owner_registration').success).toBe(true);
      expect(OtpIntentSchema.safeParse('owner_login').success).toBe(true);
      expect(OtpIntentSchema.safeParse('customer_login').success).toBe(false);
      expect(DEFAULT_OTP_TTL_MINUTES).toBe(15);
      expect(DEFAULT_RESEND_COOLDOWN_SECONDS).toBe(60);
    });
  });
});
