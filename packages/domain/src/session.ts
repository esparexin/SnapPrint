export const DEFAULT_SESSION_TTL_MINUTES = 120; // 2 hours

export class SessionExpiredError extends Error {
  constructor(message = 'QR customer session has expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class SessionNotActiveError extends Error {
  constructor(message = 'QR customer session is not active') {
    super(message);
    this.name = 'SessionNotActiveError';
  }
}

/**
 * Calculates the expiration date for a new customer QR session.
 */
export function calculateSessionExpiry(
  createdAt: Date = new Date(),
  ttlMinutes = DEFAULT_SESSION_TTL_MINUTES
): Date {
  return new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);
}

/**
 * Checks whether a customer QR session is active and unexpired.
 */
export function isSessionActive(
  session: { status: string; expiresAt: string | Date },
  now: Date = new Date()
): boolean {
  if (session.status !== 'active') {
    return false;
  }
  const expiryTime =
    typeof session.expiresAt === 'string'
      ? new Date(session.expiresAt).getTime()
      : session.expiresAt.getTime();
  return now.getTime() < expiryTime;
}

/**
 * Asserts that a customer session is active and unexpired.
 * Throws specific domain errors on invalid state.
 */
export function assertSessionActive(
  session: { status: string; expiresAt: string | Date },
  now: Date = new Date()
): void {
  if (session.status !== 'active') {
    throw new SessionNotActiveError(`Session status is '${session.status}', expected 'active'`);
  }
  if (!isSessionActive(session, now)) {
    throw new SessionExpiredError();
  }
}
