import { z } from 'zod';
import { EmailSchema } from './identity.js';

export const OTP_LENGTH = 6;
export const CURRENT_TERMS_VERSION = '2026.1';
export const CURRENT_PRIVACY_POLICY_VERSION = '2026.1';

export const OtpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' });

export type OtpCode = z.infer<typeof OtpCodeSchema>;

export const OtpIntentSchema = z.enum(['owner_registration', 'owner_login']);
export type OtpIntent = z.infer<typeof OtpIntentSchema>;

export const PhoneNumberSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[\s\-()]/g, ''))
  .pipe(
    z.string().regex(/^\+[1-9]\d{6,14}$/, {
      message:
        'Phone number must include a valid country code in E.164 format (e.g. +919876543210)',
    })
  );

export type PhoneNumber = z.infer<typeof PhoneNumberSchema>;

export const LegalAcceptanceSchema = z.object({
  termsVersion: z.string().trim().min(1).max(32),
  privacyVersion: z.string().trim().min(1).max(32),
  acceptedAt: z.string().datetime(),
});

export type LegalAcceptance = z.infer<typeof LegalAcceptanceSchema>;

export const RequestOwnerRegistrationOtpRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: EmailSchema,
  phone: PhoneNumberSchema,
  termsVersion: z.string().trim().min(1).max(32),
  privacyVersion: z.string().trim().min(1).max(32),
});

export type RequestOwnerRegistrationOtpRequest = z.infer<
  typeof RequestOwnerRegistrationOtpRequestSchema
>;

export const RequestOwnerLoginOtpRequestSchema = z.object({
  email: EmailSchema,
});

export type RequestOwnerLoginOtpRequest = z.infer<typeof RequestOwnerLoginOtpRequestSchema>;

export const VerifyOwnerOtpRequestSchema = z.object({
  email: EmailSchema,
  otp: OtpCodeSchema,
  intent: OtpIntentSchema,
});

export type VerifyOwnerOtpRequest = z.infer<typeof VerifyOwnerOtpRequestSchema>;

export const RequestOtpResponseSchema = z.object({
  statusCode: z.number().int().default(200),
  message: z.string().min(1),
  cooldownSeconds: z.number().int().min(0),
  expiresInSeconds: z.number().int().min(1),
});

export type RequestOtpResponse = z.infer<typeof RequestOtpResponseSchema>;

export const OtpVerificationStatusSchema = z.enum([
  'verified',
  'invalid_code',
  'expired',
  'max_attempts_exceeded',
  'cooldown_active',
]);

export type OtpVerificationStatus = z.infer<typeof OtpVerificationStatusSchema>;
