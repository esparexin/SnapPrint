import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  AuthResponseSchema,
  createOtpDispatchResponse,
  LegalAcceptanceSchema,
  RequestOwnerRegistrationOtpRequestSchema,
  VerifyOwnerRegistrationOtpRequestSchema,
} from '@snapprint/contracts';
import {
  calculateOtpExpiry,
  generateSecureOtp,
  hashOtpVerifier,
  verifyOtp,
} from '@snapprint/domain';
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

  // POST /auth/register - Requests email OTP for studio owner registration
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
      const dispatchResponse = createOtpDispatchResponse(normalizedEmail, 'owner_registration');

      const existingUser = await findUserByEmail(db, normalizedEmail);
      if (existingUser) {
        return reply.status(200).send(dispatchResponse);
      }

      const cooldown = await checkResendCooldown(db, normalizedEmail, 'owner_registration');
      if (!cooldown.canResend) {
        return reply.status(200).send(dispatchResponse);
      }

      const code = generateSecureOtp();
      const verifier = hashOtpVerifier(code);
      const otpId = `otp_${randomBytes(12).toString('hex')}`;
      const expiresAt = calculateOtpExpiry(new Date(), config.otpTtlMinutes);
      const legalAcceptance = LegalAcceptanceSchema.parse({
        termsVersion: parseResult.data.termsVersion,
        privacyVersion: parseResult.data.privacyVersion,
        acceptedAt: new Date().toISOString(),
      });

      await createOtpRecord(db, {
        id: otpId,
        email: normalizedEmail,
        intent: 'owner_registration',
        verifier,
        expiresAt,
        registrationData: {
          name: parseResult.data.name,
          phone: parseResult.data.phone,
          ...legalAcceptance,
        },
      });

      const emailService = getEffectiveEmail();
      const emailContent = renderRegistrationOtpEmail(code, config.otpTtlMinutes);
      try {
        await emailService.sendEmail({
          to: { email: normalizedEmail, name: parseResult.data.name },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          otp: code,
          variables: {
            otp: code,
            name: parseResult.data.name || 'Shop Owner',
          },
        });
      } catch (err) {
        if (config.nodeEnv === 'development') {
          request.log.warn(
            { err, email: normalizedEmail, devOtpCode: code },
            '[DEV] Email delivery failed or offline; OTP logged for local testing'
          );
        } else {
          await invalidatePendingOtps(db, normalizedEmail, 'owner_registration');
          throw err;
        }
      }

      return reply.status(200).send(dispatchResponse);
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
    const sendInvalidOtp = () =>
      reply.status(400).send({
        statusCode: 400,
        code: 'INVALID_OR_EXPIRED_OTP',
        message: 'Invalid or expired verification code. Please request a new code.',
      });

    const existingUser = await findUserByEmail(db, normalizedEmail);
    if (existingUser) {
      return sendInvalidOtp();
    }

    const activeOtp = await findActiveOtp(db, normalizedEmail, 'owner_registration');
    if (!activeOtp) {
      return sendInvalidOtp();
    }

    const isMatch = verifyOtp(parseResult.data.code, activeOtp.verifier);
    if (!isMatch) {
      await recordFailedAttempt(db, activeOtp.id);
      return sendInvalidOtp();
    }

    const registrationData = activeOtp.registrationData;
    if (!registrationData || !LegalAcceptanceSchema.safeParse(registrationData).success) {
      return sendInvalidOtp();
    }

    const consumed = await consumeOtpAtomically(db, activeOtp.id);
    if (!consumed) return sendInvalidOtp();

    const userId = `user_${randomBytes(12).toString('hex')}`;
    const user = await createUser(db, {
      id: userId,
      email: normalizedEmail,
      name: registrationData.name,
      phone: registrationData.phone,
      termsAcceptedVersion: registrationData.termsVersion,
      termsAcceptedAt: registrationData.acceptedAt,
      privacyPolicyAcceptedVersion: registrationData.privacyVersion,
      privacyPolicyAcceptedAt: registrationData.acceptedAt,
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
