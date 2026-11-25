import { CSSProperties } from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { TierCounts } from './admin-subscription-tier-cards';

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free Trial',
  quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly',
  yearly: 'Yearly',
};

export function formatPlanLabel(plan?: string): string {
  if (!plan) return 'No Plan';
  return PLAN_LABELS[plan] || plan;
}

export function formatPlanIntervalDetails(plan?: string): string {
  if (!plan) return '—';
  if (plan === 'free') return '1 Month (30d)';
  if (plan === 'quarterly') return '3 Months (90d)';
  if (plan === 'half_yearly') return '6 Months (180d)';
  if (plan === 'yearly') return '12 Months (365d)';
  return plan;
}

export function formatPlanCategory(plan?: string): 'free' | 'paid' | 'none' {
  if (!plan) return 'none';
  return plan === 'free' ? 'free' : 'paid';
}

export function formatDaysRemaining(expiresAt?: string, isActive = false): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (isActive) {
    if (days > 1) return `${days}d remaining`;
    if (days === 1) return '1d remaining';
    return 'Expires today';
  }
  const overdue = Math.abs(days);
  return overdue === 1 ? 'Expired yesterday' : `Expired ${overdue}d ago`;
}

export type SubscriptionBadgeState = 'active' | 'expired' | 'none';

export function getSubscriptionStatusLabel(sub?: { status: string } | null): string {
  if (!sub) return 'Not Enrolled';
  return sub.status === 'active' ? 'Active' : 'Expired';
}

export function getSubscriptionBadgeStyle(state: SubscriptionBadgeState | boolean): CSSProperties {
  if (state === 'none') {
    return {
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '0.125rem 0.45rem',
      borderRadius: '9999px',
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
    };
  }
  const isActive = state === true || state === 'active';
  return {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.125rem 0.45rem',
    borderRadius: '9999px',
    backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
    color: isActive ? '#065f46' : '#991b1b',
    border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
  };
}

export function computeTierCounts(studios: PlatformStudioItem[]): TierCounts {
  const c: TierCounts = {
    total: studios.length,
    active: 0,
    free: 0,
    paid: 0,
    oneMonth: 0,
    threeMonths: 0,
    sixMonths: 0,
    twelveMonths: 0,
    expired: 0,
    none: 0,
  };
  for (const s of studios) {
    if (!s.subscription) {
      c.none++;
      continue;
    }
    const p = s.subscription.plan;
    if (s.subscription.status === 'active') {
      c.active++;
      if (p === 'free') {
        c.free++;
        c.oneMonth++;
      } else {
        c.paid++;
        if (p === 'quarterly') c.threeMonths++;
        else if (p === 'half_yearly') c.sixMonths++;
        else if (p === 'yearly') c.twelveMonths++;
      }
    } else {
      c.expired++;
    }
  }
  return c;
}

export function filterStudiosByPlan(
  studios: PlatformStudioItem[],
  query: string,
  planFilter: string
): PlatformStudioItem[] {
  const q = query.toLowerCase();
  return studios.filter((s) => {
    const matchQ = !query || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
    const sub = s.subscription;
    const isAct = sub?.status === 'active';
    const p = sub?.plan;
    let matchP = true;
    if (planFilter === 'active') matchP = isAct;
    else if (planFilter === 'none') matchP = !sub;
    else if (planFilter === 'free') matchP = p === 'free' && isAct;
    else if (planFilter === 'paid') matchP = Boolean(sub) && p !== 'free' && isAct;
    else if (planFilter === '1mo') matchP = p === 'free' && isAct;
    else if (planFilter === '3mo') matchP = p === 'quarterly' && isAct;
    else if (planFilter === '6mo') matchP = p === 'half_yearly' && isAct;
    else if (planFilter === '12mo') matchP = p === 'yearly' && isAct;
    else if (planFilter === 'expired') matchP = sub?.status === 'expired';
    return matchQ && matchP;
  });
}
