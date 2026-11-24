import { createHash, randomBytes } from 'node:crypto';
import { FastifyReply } from 'fastify';
import { Db } from 'mongodb';
import { isOriginAllowed } from './cors.js';
import { createOperatorSession } from './repositories/operator-session.repository.js';

export const OPERATOR_COOKIE_NAME_PROD = '__Host-snapprint_op';
export const OPERATOR_COOKIE_NAME_DEV = 'snapprint_op';
export const OPERATOR_SESSION_TTL_HOURS = 24;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Pre-computed scrypt hash used for timing-attack mitigation when a user is not found.
 * Matches standard scrypt parameters (N=16384, r=8, p=1).
 */
export const DUMMY_SCRYPT_HASH =
  '$scrypt$N=16384,r=8,p=1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Returns the appropriate cookie name depending on TLS/cookieSecure setting.
 * Uses __Host- prefix in production when cookie is secure.
 */
export function getOperatorCookieName(cookieSecure: boolean): string {
  return cookieSecure ? OPERATOR_COOKIE_NAME_PROD : OPERATOR_COOKIE_NAME_DEV;
}

/**
 * Extracts the operator session token from incoming request cookies,
 * checking both __Host- prefixed and development cookie names.
 */
export function getOperatorTokenFromCookies(cookies?: {
  [cookieName: string]: string | undefined;
}): string | undefined {
  if (!cookies) return undefined;
  return cookies[OPERATOR_COOKIE_NAME_PROD] || cookies[OPERATOR_COOKIE_NAME_DEV];
}

/**
 * Computes a SHA-256 hash of the raw session token to yield the persisted sessionId.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validates the Origin header for mutating authentication requests to prevent CSRF.
 * Rejects "null" string literals, empty strings, and cross-origin mismatches.
 */
export function validateOrigin(
  originHeader: string | undefined,
  allowedOriginsStr: string
): boolean {
  return isOriginAllowed(originHeader, allowedOriginsStr);
}

/**
 * Validates Origin header against CORS whitelist; sends 403 on mismatch.
 */
export function checkCsrfOrigin(
  origin: string | undefined,
  allowedOrigins: string,
  reply: FastifyReply
): boolean {
  if (!validateOrigin(origin, allowedOrigins)) {
    reply.status(403).send({
      statusCode: 403,
      code: 'CSRF_ORIGIN_MISMATCH',
      message: 'Cross-origin authentication request forbidden',
    });
    return false;
  }
  return true;
}

/**
 * Clears the operator session cookie on the Fastify reply.
 */
export function clearOperatorSessionCookie(reply: FastifyReply, cookieSecure: boolean): void {
  const cookieName = getOperatorCookieName(cookieSecure);
  reply.clearCookie(cookieName, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSecure ? 'none' : 'lax',
  });
}

/**
 * Creates an operator session in the database and sets the session cookie on the Fastify reply.
 */
export async function issueOperatorSessionCookie(
  db: Db,
  reply: FastifyReply,
  userId: string,
  cookieSecure: boolean
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString('hex');
  const sessionId = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OPERATOR_SESSION_TTL_HOURS * 3600 * 1000);

  await createOperatorSession(db, {
    sessionId,
    userId,
    status: 'active',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActiveAt: now.toISOString(),
  });

  const cookieName = getOperatorCookieName(cookieSecure);
  reply.setCookie(cookieName, rawToken, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSecure ? 'none' : 'lax',
    expires: expiresAt,
  });

  return { rawToken, expiresAt };
}
