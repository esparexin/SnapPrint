import { z } from 'zod';
import { EmailSchema } from './identity.js';

export const OTP_LENGTH = 6;
export const DEFAULT_OTP_TTL_MINUTES = 15;
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
export const CURRENT_TERMS_VERSION = '2026.1';
export const CURRENT_PRIVACY_POLICY_VERSION = '2026.1';
export const OTP_DISPATCH_MESSAGE = 'If this email is eligible, a verification code will be sent.';

export const OtpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), {
    message: `OTP must be exactly ${OTP_LENGTH} digits`,
  });

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
  termsVersion: z.literal(CURRENT_TERMS_VERSION),
  privacyVersion: z.literal(CURRENT_PRIVACY_POLICY_VERSION),
  acceptedAt: z.string().datetime(),
});

export type LegalAcceptance = z.infer<typeof LegalAcceptanceSchema>;

export const RequestOwnerRegistrationOtpRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: EmailSchema,
  phone: PhoneNumberSchema,
  termsAccepted: z.literal(true),
  privacyPolicyAccepted: z.literal(true),
  termsVersion: z.literal(CURRENT_TERMS_VERSION),
  privacyVersion: z.literal(CURRENT_PRIVACY_POLICY_VERSION),
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
  code: OtpCodeSchema,
});

export type VerifyOwnerOtpRequest = z.infer<typeof VerifyOwnerOtpRequestSchema>;

export const VerifyOwnerRegistrationOtpRequestSchema = VerifyOwnerOtpRequestSchema;

export type VerifyOwnerRegistrationOtpRequest = z.infer<
  typeof VerifyOwnerRegistrationOtpRequestSchema
>;

export const VerifyOwnerLoginOtpRequestSchema = VerifyOwnerOtpRequestSchema;

export type VerifyOwnerLoginOtpRequest = z.infer<typeof VerifyOwnerLoginOtpRequestSchema>;

export const OtpDispatchResponseSchema = z.object({
  email: EmailSchema,
  intent: OtpIntentSchema,
  message: z.literal(OTP_DISPATCH_MESSAGE),
  resendCooldownSeconds: z.literal(DEFAULT_RESEND_COOLDOWN_SECONDS),
  retryAfterSeconds: z.literal(DEFAULT_RESEND_COOLDOWN_SECONDS),
});

export type OtpDispatchResponse = z.infer<typeof OtpDispatchResponseSchema>;

export function createOtpDispatchResponse(email: string, intent: OtpIntent): OtpDispatchResponse {
  return OtpDispatchResponseSchema.parse({
    email,
    intent,
    message: OTP_DISPATCH_MESSAGE,
    resendCooldownSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
    retryAfterSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
  });
}
