import { createHmac, timingSafeEqual } from 'node:crypto';
import { CustomerQrSessionSchema } from '@snapprint/contracts';
import { assertSessionActive, SessionExpiredError, SessionNotActiveError } from '@snapprint/domain';

export class InvalidSessionTokenError extends Error {
  constructor(message = 'Invalid session token') {
    super(message);
    this.name = 'InvalidSessionTokenError';
  }
}

export interface SessionTokenPayload {
  sessionId: string;
  studioId: string;
  expiresAt: string;
}

export function signSessionToken(payload: SessionTokenPayload, secret: string): string {
  // Validate payload adheres to schema
  const parsed = CustomerQrSessionSchema.pick({
    sessionId: true,
    studioId: true,
    expiresAt: true,
  }).parse(payload);

  const payloadB64 = Buffer.from(JSON.stringify(parsed)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now: Date = new Date()
): SessionTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new InvalidSessionTokenError('Session token is missing or invalid');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new InvalidSessionTokenError('Session token format is invalid');
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    throw new InvalidSessionTokenError('Session token parts are empty');
  }

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new InvalidSessionTokenError('Session token signature verification failed');
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidSessionTokenError('Session token payload is not valid JSON');
  }

  const parseResult = CustomerQrSessionSchema.pick({
    sessionId: true,
    studioId: true,
    expiresAt: true,
  }).safeParse(rawPayload);

  if (!parseResult.success) {
    throw new InvalidSessionTokenError('Session token payload schema mismatch');
  }

  const session = parseResult.data;

  // Enforce session expiration using pure domain rules
  assertSessionActive({ status: 'active', expiresAt: session.expiresAt }, now);

  return session;
}

/**
 * Resolves a customer session ID from a request token header or Bearer token.
 * Validates cryptographic signature and expiration if a signed token is provided,
 * and checks studio match if expectedStudioId is supplied.
 */
export function resolveSessionIdFromHeader(
  tokenHeader: string | undefined,
  secret: string,
  expectedStudioId?: string
): string | null {
  if (!tokenHeader || typeof tokenHeader !== 'string') return null;
  const token = tokenHeader.startsWith('Bearer ')
    ? tokenHeader.slice(7).trim()
    : tokenHeader.trim();
  if (!token) return null;

  if (token.includes('.')) {
    try {
      const payload = verifySessionToken(token, secret);
      if (expectedStudioId && payload.studioId !== expectedStudioId) {
        return null;
      }
      return payload.sessionId;
    } catch {
      return null;
    }
  }

  return token;
}

export { SessionExpiredError, SessionNotActiveError };
