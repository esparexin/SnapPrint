import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  AuthResponseSchema,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  OtpDispatchResponseSchema,
  RequestOwnerRegistrationOtpRequestSchema,
  VerifyOwnerRegistrationOtpRequestSchema,
} from '@snapprint/contracts';
import { generateSecureOtp, hashOtpVerifier, verifyOtp } from '@snapprint/domain';
import { issueOperatorSessionCookie, validateOrigin } from './auth-utils.js';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { createEmailService, EmailService } from './email/email-service.js';
import { renderRegistrationOtpEmail } from './email/email-templates.js';
import { createUserMembership, findUserMemberships } from './repositories/membership.repository.js';
import {
  checkResendCooldown,
  consumeOtpAtomically,
  createOtpRecord,
  findActiveOtp,
  invalidatePendingOtps,
  recordFailedAttempt,
} from './repositories/otp.repository.js';
import { createUser, findUserByEmail } from './repositories/user.repository.js';

export interface AuthRegistrationRouteOptions {
  db?: Db;
  config?: AppConfig;
  emailService?: EmailService;
}

export const authRegistrationRoutes: FastifyPluginAsync<AuthRegistrationRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveConfig = (): AppConfig => opts?.config ?? loadConfig();
  const getEffectiveEmail = (): EmailService =>
    opts?.emailService ?? createEmailService(getEffectiveConfig());

  // POST /auth/register - Dispatches email OTP for studio owner registration
  app.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const config = getEffectiveConfig();
      if (!validateOrigin(request.headers.origin, config.corsAllowedOrigins)) {
        return reply.status(403).send({
          statusCode: 403,
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Cross-origin authentication request forbidden',
        });
      }

      const parseResult = RequestOwnerRegistrationOtpRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration request payload',
          issues: parseResult.error.issues,
        });
      }

      const db = getEffectiveDb();
      const normalizedEmail = parseResult.data.email.trim().toLowerCase();

      const existingUser = await findUserByEmail(db, normalizedEmail);
      if (existingUser) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'USER_ALREADY_EXISTS',
          message: 'An account with this email address already exists. Please sign in instead.',
        });
      }

      const cooldown = await checkResendCooldown(db, normalizedEmail, 'owner_registration');
      if (!cooldown.canResend) {
        return reply.status(429).send({
          statusCode: 429,
          code: 'COOLDOWN_ACTIVE',
          message: `Please wait ${cooldown.remainingCooldownSeconds} seconds before requesting a new code.`,
          retryAfterSeconds: cooldown.remainingCooldownSeconds,
        });
      }

      const code = generateSecureOtp();
      const verifier = hashOtpVerifier(code);
      const otpId = `otp_${randomBytes(12).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await createOtpRecord(db, {
        id: otpId,
        email: normalizedEmail,
        intent: 'owner_registration',
        verifier,
        expiresAt,
        registrationData: {
          name: parseResult.data.name,
          phone: parseResult.data.phone,
          termsVersion: parseResult.data.termsVersion,
          privacyVersion: parseResult.data.privacyVersion,
        },
      });

      const emailService = getEffectiveEmail();
      const emailContent = renderRegistrationOtpEmail(code, 15);
      try {
        await emailService.sendEmail({
          to: { email: normalizedEmail, name: parseResult.data.name },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (err) {
        await invalidatePendingOtps(db, normalizedEmail, 'owner_registration');
        throw err;
      }

      return reply.status(200).send(
        OtpDispatchResponseSchema.parse({
          success: true,
          email: normalizedEmail,
          intent: 'owner_registration',
          expiresAt: expiresAt.toISOString(),
          resendCooldownSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
          retryAfterSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
        })
      );
    }
  );

  // POST /auth/register/verify - Verifies registration OTP and establishes owner account
  app.post('/auth/register/verify', async (request, reply) => {
    const config = getEffectiveConfig();
    if (!validateOrigin(request.headers.origin, config.corsAllowedOrigins)) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'CSRF_ORIGIN_MISMATCH',
        message: 'Cross-origin authentication request forbidden',
      });
    }

    const parseResult = VerifyOwnerRegistrationOtpRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid verification request payload',
        issues: parseResult.error.issues,
      });
    }

    const db = getEffectiveDb();
    const normalizedEmail = parseResult.data.email.trim().toLowerCase();

    const existingUser = await findUserByEmail(db, normalizedEmail);
    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'USER_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please sign in instead.',
      });
    }

    const activeOtp = await findActiveOtp(db, normalizedEmail, 'owner_registration');
    if (!activeOtp) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'INVALID_OR_EXPIRED_OTP',
        message: 'Invalid, expired, or exhausted verification code. Please request a new code.',
      });
    }

    const isMatch = verifyOtp(parseResult.data.code, activeOtp.verifier);
    if (!isMatch) {
      const attempt = await recordFailedAttempt(db, activeOtp.id);
      const code = attempt.exhausted ? 'OTP_EXHAUSTED' : 'INVALID_OTP';
      const msg = attempt.exhausted
        ? 'Maximum verification attempts exceeded. Please request a new code.'
        : 'Invalid verification code. Please check and try again.';
      return reply.status(400).send({ statusCode: 400, code, message: msg });
    }

    const consumed = await consumeOtpAtomically(db, activeOtp.id);
    if (!consumed) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'OTP_ALREADY_CONSUMED',
        message: 'Verification code has already been consumed. Please request a new code.',
      });
    }

    const userId = `user_${randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();
    const user = await createUser(db, {
      id: userId,
      email: normalizedEmail,
      name: activeOtp.registrationData?.name ?? 'Studio Owner',
      phone: activeOtp.registrationData?.phone,
      termsAcceptedVersion: activeOtp.registrationData?.termsVersion,
      termsAcceptedAt: now,
      privacyPolicyAcceptedVersion: activeOtp.registrationData?.privacyVersion,
      privacyPolicyAcceptedAt: now,
      passwordHash: null,
    });

    await createUserMembership(db, {
      userId,
      studioId: null,
      role: 'studio_owner',
      status: 'active',
    });

    await issueOperatorSessionCookie(db, reply, userId, Boolean(config.cookieSecure));
    const memberships = await findUserMemberships(db, userId);
    return reply.status(201).send(AuthResponseSchema.parse({ user, memberships }));
  });
};
