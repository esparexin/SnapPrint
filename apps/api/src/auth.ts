import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { AuthResponseSchema, LoginRequestSchema } from '@snapprint/contracts';
import { verifyPassword } from '@snapprint/domain';
import {
  DUMMY_SCRYPT_HASH,
  getOperatorCookieName,
  getOperatorTokenFromCookies,
  hashSessionToken,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  OPERATOR_SESSION_TTL_HOURS,
  validateOrigin,
} from './auth-utils.js';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { findUserMemberships } from './repositories/membership.repository.js';
import {
  createOperatorSession,
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
        reply.status(403).send({
          statusCode: 403,
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Cross-origin authentication request forbidden',
        });
        return;
      }

      const parseResult = LoginRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid login request payload',
          issues: parseResult.error.issues,
        });
        return;
      }

      const db = getEffectiveDb();
      const normalizedEmail = parseResult.data.email.trim().toLowerCase();
      const user = await findUserDocumentByEmail(db, normalizedEmail);

      const sendInvalidCredentials = () =>
        reply.status(401).send({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });

      // Timing defense: if user not found, perform dummy scrypt verification to prevent enumeration
      if (!user) {
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        return sendInvalidCredentials();
      }

      // Check account lockout (including race-condition recovery if attempts threshold met)
      const isLocked =
        (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) ||
        (!user.lockoutUntil && (user.failedLoginAttempts ?? 0) >= MAX_FAILED_LOGIN_ATTEMPTS);

      if (isLocked) {
        if (!user.lockoutUntil) {
          await recordFailedLogin(db, user.id, new Date(Date.now() + LOCKOUT_DURATION_MS));
        }
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        request.log.info({ userId: user.id }, 'Operator login rejected: account locked');
        return sendInvalidCredentials();
      }

      // Check account status
      if (user.status !== 'active') {
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        request.log.info(
          { userId: user.id, status: user.status },
          'Operator login rejected: inactive'
        );
        return sendInvalidCredentials();
      }

      // Passwordless defense: if account has no password, perform dummy scrypt verification
      if (!user.passwordHash) {
        await verifyPassword(parseResult.data.password, DUMMY_SCRYPT_HASH);
        return sendInvalidCredentials();
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
        return sendInvalidCredentials();
      }

      // Authentication succeeded: reset failed login attempts
      await resetFailedLogins(db, user.id);

      // Generate cryptographically secure session token and hash it for DB persistence
      const rawToken = randomBytes(32).toString('hex');
      const sessionId = hashSessionToken(rawToken);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OPERATOR_SESSION_TTL_HOURS * 3600 * 1000);

      await createOperatorSession(db, {
        sessionId,
        userId: user.id,
        status: 'active',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastActiveAt: now.toISOString(),
      });

      // Issue HttpOnly, SameSite=Strict session cookie
      const cookieSecure = Boolean(config.cookieSecure);
      const cookieName = getOperatorCookieName(cookieSecure);
      reply.setCookie(cookieName, rawToken, {
        path: '/',
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'strict',
        expires: expiresAt,
      });

      const memberships = await findUserMemberships(db, user.id);
      return reply
        .status(200)
        .send(AuthResponseSchema.parse({ user: toPublicUser(user), memberships }));
    }
  );

  // POST /auth/logout - Targeted session revocation and cookie clearing
  app.post('/auth/logout', async (request, reply) => {
    const config = getEffectiveConfig();

    if (!validateOrigin(request.headers.origin, config.corsAllowedOrigins)) {
      reply.status(403).send({
        statusCode: 403,
        code: 'CSRF_ORIGIN_MISMATCH',
        message: 'Cross-origin authentication request forbidden',
      });
      return;
    }

    const rawToken = getOperatorTokenFromCookies(request.cookies);
    if (rawToken) {
      try {
        const db = getEffectiveDb();
        const sessionId = hashSessionToken(rawToken);
        const session = await findOperatorSessionByToken(db, sessionId);
        if (session) {
          await revokeOperatorSession(db, sessionId, session.userId);
        }
      } catch {
        // Idempotent: ignore DB error during logout cleanup
      }
    }

    const cookieSecure = Boolean(config.cookieSecure);
    const cookieName = getOperatorCookieName(cookieSecure);
    reply.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
    });

    return reply.status(200).send({ statusCode: 200, message: 'Logged out successfully' });
  });

  // GET /auth/me - Retrieve current authenticated operator profile
  app.get('/auth/me', async (request, reply) => {
    const rawToken = getOperatorTokenFromCookies(request.cookies);
    if (!rawToken) {
      reply.status(401).send({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No session cookie provided.',
      });
      return;
    }

    const db = getEffectiveDb();
    const sessionId = hashSessionToken(rawToken);
    const session = await findActiveOperatorSession(db, sessionId);

    if (!session) {
      reply.status(401).send({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'Session is invalid, expired, or has been revoked.',
      });
      return;
    }

    const user = await findUserById(db, session.userId);
    if (!user || user.status !== 'active') {
      reply.status(401).send({
        statusCode: 401,
        code: 'USER_INACTIVE',
        message: 'Operator account is suspended or no longer active.',
      });
      return;
    }

    const memberships = await findUserMemberships(db, user.id);
    return reply.status(200).send(AuthResponseSchema.parse({ user, memberships }));
  });
};
