import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  AuthResponseSchema,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  OtpDispatchResponseSchema,
  RequestOwnerLoginOtpRequestSchema,
  VerifyOwnerLoginOtpRequestSchema,
} from '@snapprint/contracts';
import { generateSecureOtp, hashOtpVerifier, verifyOtp } from '@snapprint/domain';
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

  // POST /auth/login/otp/request - Dispatches login OTP with timing defense against enumeration
  app.post('/auth/login/otp/request', async (request, reply) => {
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

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const genericResponse = OtpDispatchResponseSchema.parse({
      success: true,
      email: normalizedEmail,
      intent: 'owner_login',
      expiresAt,
      resendCooldownSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
      retryAfterSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
    });

    // Timing defense: if user doesn't exist or is not active, return generic success without email
    if (!user || user.status !== 'active') {
      return reply.status(200).send(genericResponse);
    }

    const cooldown = await checkResendCooldown(db, normalizedEmail, 'owner_login');
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

    await createOtpRecord(db, {
      id: otpId,
      email: normalizedEmail,
      intent: 'owner_login',
      verifier,
      expiresAt: new Date(expiresAt),
    });

    const emailService = getEffectiveEmail();
    const emailContent = renderLoginOtpEmail(code, 15);
    await emailService.sendEmail({
      to: { email: normalizedEmail, name: user.name },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return reply.status(200).send(genericResponse);
  });

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
