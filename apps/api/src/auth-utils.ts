import { createHash } from 'node:crypto';

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
  if (!originHeader) {
    // Non-browser or direct requests without Origin header are permitted
    return true;
  }
  const trimmed = originHeader.trim();
  if (trimmed === 'null' || trimmed === '') {
    return false;
  }
  try {
    const parsedOrigin = new URL(trimmed).origin.toLowerCase();
    const allowed = allowedOriginsStr
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((s) => {
        try {
          return new URL(s).origin.toLowerCase();
        } catch {
          return s;
        }
      });
    return allowed.includes(parsedOrigin);
  } catch {
    return false;
  }
}
