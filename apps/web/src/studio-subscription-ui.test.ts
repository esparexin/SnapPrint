import { describe, expect, it } from 'vitest';
import { PAID_TIERS } from '../app/components/studio-subscription-tiers';
import {
  formatDaysRemaining,
  formatPlanLabel,
  getSubscriptionBadgeStyle,
} from '../app/admin/admin-subscription-helpers';

describe('studio-subscription-ui', () => {
  it('defines valid paid tiers with quarterly, half-yearly, and yearly options', () => {
    expect(PAID_TIERS).toHaveLength(3);
    const plans = PAID_TIERS.map((t) => t.id);
    expect(plans).toEqual(['quarterly', 'half_yearly', 'yearly']);

    const yearly = PAID_TIERS.find((t) => t.id === 'yearly');
    expect(yearly?.popular).toBe(true);
    expect(yearly?.duration).toBe('365 Days');
  });

  it('formats plan labels correctly', () => {
    expect(formatPlanLabel('free')).toBe('Free Trial');
    expect(formatPlanLabel('quarterly')).toBe('Quarterly');
    expect(formatPlanLabel('half_yearly')).toBe('Half-Yearly');
    expect(formatPlanLabel('yearly')).toBe('Yearly');
    expect(formatPlanLabel()).toBe('No Plan');
  });

  it('formats days remaining and badge styles for active and expired states', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(formatDaysRemaining(future, true)).toContain('remaining');

    const past = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatDaysRemaining(past, false)).toContain('Expired');

    const activeBadge = getSubscriptionBadgeStyle(true);
    expect(activeBadge.backgroundColor).toBe('#ecfdf5');

    const expiredBadge = getSubscriptionBadgeStyle(false);
    expect(expiredBadge.backgroundColor).toBe('#fef2f2');
  });
});
