import { describe, expect, it } from 'vitest';
import {
  calculateSubscriptionExpiry,
  deriveSubscriptionStatus,
  extendSubscription,
  isSubscriptionActive,
} from './subscription-policy.js';

describe('Subscription Policy Pure Domain SSOT', () => {
  describe('Decision 3: Fixed-Day Duration and Expiry Calculations', () => {
    it('calculates fixed 30 days for free tier across non-leap month boundary', () => {
      // 2025 non-leap: Jan 31 + 30 days = March 2, 2025
      const start = new Date('2025-01-31T12:00:00.000Z');
      expect(calculateSubscriptionExpiry(start, 'free').toISOString()).toBe(
        '2025-03-02T12:00:00.000Z'
      );
    });

    it('calculates fixed 30 days for free tier across leap year boundary', () => {
      // 2024 leap year (Feb 29 exists): Jan 31 + 30 days = March 1, 2024
      const start = new Date('2024-01-31T12:00:00.000Z');
      expect(calculateSubscriptionExpiry(start, 'free').toISOString()).toBe(
        '2024-03-01T12:00:00.000Z'
      );
    });

    it('calculates fixed 90 days for quarterly tier', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      // Jan (31) + Feb (28) + Mar (31) = 90 days -> 2026-04-01T00:00:00.000Z
      expect(calculateSubscriptionExpiry(start, 'quarterly').toISOString()).toBe(
        '2026-04-01T00:00:00.000Z'
      );
    });

    it('calculates fixed 180 days for half-yearly tier', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const expiry = calculateSubscriptionExpiry(start, 'half_yearly');
      expect(expiry.getTime() - start.getTime()).toBe(180 * 86_400_000);
    });

    it('calculates fixed 365 days for yearly tier', () => {
      const start = new Date('2026-01-01T00:00:00.000Z');
      const expiry = calculateSubscriptionExpiry(start, 'yearly');
      expect(expiry.getTime() - start.getTime()).toBe(365 * 86_400_000);
      expect(expiry.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });

    it('rejects invalid timestamps with deterministic error', () => {
      expect(() => calculateSubscriptionExpiry('not-a-date', 'free')).toThrow(
        /Invalid timestamp provided for startDate/
      );
    });

    it('rejects invalid plan identifiers', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(() => calculateSubscriptionExpiry('2026-01-01T00:00:00.000Z', 'unknown_plan')).toThrow(
        /Unknown subscription plan/
      );
    });
  });

  describe('Decision 2: Zero-Day Grace Period Policy', () => {
    const expiryStr = '2026-06-01T00:00:00.000Z';
    const expiryMs = new Date(expiryStr).getTime();

    it('is active 1 millisecond before expiration', () => {
      const now = new Date(expiryMs - 1);
      expect(isSubscriptionActive(expiryStr, now)).toBe(true);
      expect(deriveSubscriptionStatus(expiryStr, now)).toBe('active');
    });

    it('is active at the exact expiration millisecond', () => {
      const now = new Date(expiryMs);
      expect(isSubscriptionActive(expiryStr, now)).toBe(true);
      expect(deriveSubscriptionStatus(expiryStr, now)).toBe('active');
    });

    it('is expired 1 millisecond after expiration (zero grace period)', () => {
      const now = new Date(expiryMs + 1);
      expect(isSubscriptionActive(expiryStr, now)).toBe(false);
      expect(deriveSubscriptionStatus(expiryStr, now)).toBe('expired');
    });

    it('is expired 1 day after expiration without implicit extension', () => {
      const now = new Date(expiryMs + 86_400_000);
      expect(isSubscriptionActive(expiryStr, now)).toBe(false);
      expect(deriveSubscriptionStatus(expiryStr, now)).toBe('expired');
    });
  });

  describe('Subscription Extension (Cumulative Renewal)', () => {
    it('extends from current expiration if renewed while still active', () => {
      const currentExpiry = '2026-06-01T00:00:00.000Z';
      const renewalTime = '2026-05-15T10:00:00.000Z'; // 16 days before expiry
      const result = extendSubscription(currentExpiry, 'quarterly', renewalTime);

      expect(result.durationDays).toBe(90);
      expect(result.previousExpiresAt).toBe(currentExpiry);
      const expected = new Date(new Date(currentExpiry).getTime() + 90 * 86_400_000).toISOString();
      expect(result.newExpiresAt).toBe(expected);
    });

    it('extends from renewal timestamp if already expired', () => {
      const currentExpiry = '2026-06-01T00:00:00.000Z';
      const renewalTime = '2026-06-10T12:00:00.000Z'; // 9 days after expiry
      const result = extendSubscription(currentExpiry, 'free', renewalTime);

      expect(result.durationDays).toBe(30);
      const expected = new Date(new Date(renewalTime).getTime() + 30 * 86_400_000).toISOString();
      expect(result.newExpiresAt).toBe(expected);
    });

    it('creates initial subscription from renewal timestamp if no prior expiry exists', () => {
      const renewalTime = '2026-01-01T00:00:00.000Z';
      const result = extendSubscription(null, 'free', renewalTime);

      expect(result.durationDays).toBe(30);
      expect(result.previousExpiresAt).toBe(renewalTime);
      expect(result.newExpiresAt).toBe('2026-01-31T00:00:00.000Z');
    });
  });
});
