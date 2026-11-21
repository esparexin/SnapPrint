import { describe, expect, it } from 'vitest';
import {
  assertSessionActive,
  calculateSessionExpiry,
  DEFAULT_SESSION_TTL_MINUTES,
  isSessionActive,
  SessionExpiredError,
  SessionNotActiveError,
} from './session.js';

describe('Session Domain Logic', () => {
  it('calculates session expiry with default 2 hours TTL', () => {
    const created = new Date('2026-11-21T12:00:00Z');
    const expiry = calculateSessionExpiry(created);
    expect(expiry.getTime() - created.getTime()).toBe(DEFAULT_SESSION_TTL_MINUTES * 60 * 1000);
  });

  it('identifies active and expired sessions', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    const activeSession = {
      status: 'active',
      expiresAt: new Date('2026-11-21T13:00:00Z'),
    };
    const expiredSession = {
      status: 'active',
      expiresAt: new Date('2026-11-21T11:00:00Z'),
    };

    expect(isSessionActive(activeSession, now)).toBe(true);
    expect(isSessionActive(expiredSession, now)).toBe(false);
  });

  it('assertSessionActive throws appropriate domain errors', () => {
    const now = new Date('2026-11-21T12:00:00Z');
    const inactiveSession = { status: 'completed', expiresAt: new Date('2026-11-21T13:00:00Z') };
    const expiredSession = { status: 'active', expiresAt: new Date('2026-11-21T11:00:00Z') };

    expect(() => assertSessionActive(inactiveSession, now)).toThrow(SessionNotActiveError);
    expect(() => assertSessionActive(expiredSession, now)).toThrow(SessionExpiredError);
  });
});
