import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { AuthResponseSchema, LoginRequestSchema } from '@snapprint/contracts';
import { verifyPassword } from '@snapprint/domain';
import {
  checkCsrfOrigin,
  clearOperatorSessionCookie,
  DUMMY_SCRYPT_HASH,
  getOperatorTokenFromCookies,
  hashSessionToken,
  issueOperatorSessionCookie,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from './auth-utils.js';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { findUserMemberships } from './repositories/membership.repository.js';
import {
  findActiveOperatorSession,
  findOperatorSessionByToken,
  revokeOperatorSession,
} from './repositories/operator-session.repository.js';
import {
  findUserById,
  findUserDocumentByEmail,
  recordFailedLogin,
  resetFailedLogins,
  toPublicUser,
} from './repositories/user.repository.js';

export interface AuthRouteOptions {
  db?: Db;
  config?: AppConfig;
}

export const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (app, opts) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveConfig = (): AppConfig => opts?.config ?? loadConfig();

  // POST /auth/login - Operator login with scrypt verification, rate-limiting & session cookie
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const config = getEffectiveConfig();
      if (!checkCsrfOrigin(request.headers.origin, config.corsAllowedOrigins, reply)) return;

      const parseResult = LoginRequestSchema.safeParse(request.body);
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

      const invalidCreds = () =>
        reply.status(401).send({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });

      // Timing defense: if user not found, perform dummy scrypt verification
      if (!user) {
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        return invalidCreds();
      }

      // Check account lockout
      const isLocked =
        (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) ||
        (!user.lockoutUntil && (user.failedLoginAttempts ?? 0) >= MAX_FAILED_LOGIN_ATTEMPTS);

      if (isLocked) {
        if (!user.lockoutUntil) {
          await recordFailedLogin(db, user.id, new Date(Date.now() + LOCKOUT_DURATION_MS));
        }
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        request.log.info({ userId: user.id }, 'Operator login rejected: account locked');
        return invalidCreds();
      }

      // Check account status and password presence
      if (user.status !== 'active' || !user.passwordHash) {
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        request.log.info({ userId: user.id, status: user.status }, 'Operator login rejected');
        return invalidCreds();
      }

      // Verify credentials with scrypt
      const passwordMatch = await verifyPassword(parseResult.data.password, user.passwordHash);
      if (!passwordMatch) {
        const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
        const lockUntil =
          failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : undefined;

        await recordFailedLogin(db, user.id, lockUntil);
        return invalidCreds();
      }

      // Authentication succeeded: reset failed login attempts and issue session
      await resetFailedLogins(db, user.id);
      await issueOperatorSessionCookie(db, reply, user.id, Boolean(config.cookieSecure));

      const memberships = await findUserMemberships(db, user.id);
      return reply
        .status(200)
        .send(AuthResponseSchema.parse({ user: toPublicUser(user), memberships }));
    }
  );

  // POST /auth/logout - Targeted session revocation and cookie clearing
  app.post('/auth/logout', async (request, reply) => {
    const config = getEffectiveConfig();
    if (!checkCsrfOrigin(request.headers.origin, config.corsAllowedOrigins, reply)) return;

    const rawToken = getOperatorTokenFromCookies(request.cookies);
    if (rawToken) {
      try {
        const db = getEffectiveDb();
        const sessionId = hashSessionToken(rawToken);
        const session = await findOperatorSessionByToken(db, sessionId);
        if (session) await revokeOperatorSession(db, sessionId, session.userId);
      } catch {
        // Idempotent: ignore DB error during logout cleanup
      }
    }

    clearOperatorSessionCookie(reply, Boolean(config.cookieSecure));
    return reply.status(200).send({ statusCode: 200, message: 'Logged out successfully' });
  });

  // GET /auth/me - Retrieve current authenticated operator profile
  app.get('/auth/me', async (request, reply) => {
    const rawToken = getOperatorTokenFromCookies(request.cookies);
    if (!rawToken) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No session cookie provided.',
      });
    }

    const db = getEffectiveDb();
    const sessionId = hashSessionToken(rawToken);
    const session = await findActiveOperatorSession(db, sessionId);
    if (!session) {
      return reply.status(401).send({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'Session is invalid, expired, or has been revoked.',
      });
    }

    const user = await findUserById(db, session.userId);
    if (!user || user.status !== 'active') {
      return reply.status(401).send({
        statusCode: 401,
        code: 'USER_INACTIVE',
        message: 'Operator account is suspended or no longer active.',
      });
    }

    const memberships = await findUserMemberships(db, user.id);
    return reply.status(200).send(AuthResponseSchema.parse({ user, memberships }));
  });
};
