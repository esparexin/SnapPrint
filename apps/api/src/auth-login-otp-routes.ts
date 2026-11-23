import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  AuthResponseSchema,
  createOtpDispatchResponse,
  RequestOwnerLoginOtpRequestSchema,
  VerifyOwnerLoginOtpRequestSchema,
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
import { renderLoginOtpEmail } from './email/email-templates.js';
import { findUserMemberships } from './repositories/membership.repository.js';
import {
  checkResendCooldown,
  consumeOtpAtomically,
  createOtpRecord,
  findActiveOtp,
  invalidatePendingOtps,
  recordFailedAttempt,
} from './repositories/otp.repository.js';
import { findUserDocumentByEmail, toPublicUser } from './repositories/user.repository.js';

export interface AuthLoginOtpRouteOptions {
  db?: Db;
  config?: AppConfig;
  emailService?: EmailService;
}

export const authLoginOtpRoutes: FastifyPluginAsync<AuthLoginOtpRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveConfig = (): AppConfig => opts?.config ?? loadConfig();
  const getEffectiveEmail = (): EmailService =>
    opts?.emailService ?? createEmailService(getEffectiveConfig());

  // POST /auth/login/otp/request - Requests login OTP with generic responses
  app.post(
    '/auth/login/otp/request',
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

      const parseResult = RequestOwnerLoginOtpRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid login request payload',
          issues: parseResult.error.issues,
        });
      }

      const db = getEffectiveDb();
      const normalizedEmail = parseResult.data.email.trim().toLowerCase();
      const user = await findUserDocumentByEmail(db, normalizedEmail);
      const genericResponse = createOtpDispatchResponse(normalizedEmail, 'owner_login');

      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'USER_NOT_REGISTERED',
          message: 'No account found with this email. Please register your print store first.',
        });
      }

      if (user.status !== 'active') {
        return reply.status(403).send({
          statusCode: 403,
          code: 'USER_INACTIVE',
          message: 'This account is not active. Please contact support.',
        });
      }

      const cooldown = await checkResendCooldown(db, normalizedEmail, 'owner_login');
      if (!cooldown.canResend) {
        return reply.status(200).send(genericResponse);
      }

      const code = generateSecureOtp();
      const verifier = hashOtpVerifier(code);
      const otpId = `otp_${randomBytes(12).toString('hex')}`;
      const expiresAt = calculateOtpExpiry(new Date(), config.otpTtlMinutes);

      await createOtpRecord(db, {
        id: otpId,
        email: normalizedEmail,
        intent: 'owner_login',
        verifier,
        expiresAt,
      });

      const emailService = getEffectiveEmail();
      const emailContent = renderLoginOtpEmail(code, config.otpTtlMinutes);
      try {
        await emailService.sendEmail({
          to: { email: normalizedEmail, name: user.name },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (err) {
        await invalidatePendingOtps(db, normalizedEmail, 'owner_login');
        throw err;
      }

      return reply.status(200).send(genericResponse);
    }
  );

  // POST /auth/login/otp/verify - Verifies login OTP and issues operator session cookie
  app.post('/auth/login/otp/verify', async (request, reply) => {
    const config = getEffectiveConfig();
    if (!validateOrigin(request.headers.origin, config.corsAllowedOrigins)) {
      return reply.status(403).send({
        statusCode: 403,
        code: 'CSRF_ORIGIN_MISMATCH',
        message: 'Cross-origin authentication request forbidden',
      });
    }

    const parseResult = VerifyOwnerLoginOtpRequestSchema.safeParse(request.body);
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
    const user = await findUserDocumentByEmail(db, normalizedEmail);

    const sendInvalidCredentials = () =>
      reply.status(401).send({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or verification code',
      });

    if (!user || user.status !== 'active') {
      return sendInvalidCredentials();
    }

    const activeOtp = await findActiveOtp(db, normalizedEmail, 'owner_login');
    if (!activeOtp) {
      return sendInvalidCredentials();
    }

    const isMatch = verifyOtp(parseResult.data.code, activeOtp.verifier);
    if (!isMatch) {
      await recordFailedAttempt(db, activeOtp.id);
      return sendInvalidCredentials();
    }

    const consumed = await consumeOtpAtomically(db, activeOtp.id);
    if (!consumed) {
      return sendInvalidCredentials();
    }

    await issueOperatorSessionCookie(db, reply, user.id, Boolean(config.cookieSecure));
    const memberships = await findUserMemberships(db, user.id);
    return reply
      .status(200)
      .send(AuthResponseSchema.parse({ user: toPublicUser(user), memberships }));
  });
};
