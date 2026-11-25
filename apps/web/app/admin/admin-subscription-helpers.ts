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

export function formatPlanDetails(plan?: string): string {
  if (!plan) return '—';
  if (plan === 'free') return 'Free Plan';
  if (plan === 'quarterly') return 'Quarterly Plan';
  if (plan === 'half_yearly') return 'Half-Yearly Plan';
  if (plan === 'yearly') return 'Yearly Plan';
  return plan;
}

export const formatPlanIntervalDetails = formatPlanDetails;

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
      } else {
        c.paid++;
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
    else if (planFilter === 'expired') matchP = sub?.status === 'expired';
    return matchQ && matchP;
  });
}

export type SubscriptionSortColumn =
  | 'studio'
  | 'category'
  | 'plan'
  | 'startsAt'
  | 'expiresAt'
  | 'remaining';

export type SortDirection = 'asc' | 'desc';

export interface SubscriptionColumnConfig {
  key: SubscriptionSortColumn;
  label: string;
}

export const subFilterStyles = {
  input: {
    flex: '1 1 200px',
    minHeight: '44px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.375rem',
    fontSize: '1rem',
  } as CSSProperties,
  select: {
    minHeight: '44px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    backgroundColor: '#fff',
  } as CSSProperties,
  notify: {
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
  } as CSSProperties,
};

export const SUBSCRIPTION_COLUMNS: SubscriptionColumnConfig[] = [
  { key: 'studio', label: 'Studio' },
  { key: 'category', label: 'Category' },
  { key: 'plan', label: 'Plan Details' },
  { key: 'startsAt', label: 'Plan Date' },
  { key: 'expiresAt', label: 'Expires At' },
  { key: 'remaining', label: 'Remaining' },
];

export function sortStudios(
  studios: PlatformStudioItem[],
  column: SubscriptionSortColumn,
  direction: SortDirection
): PlatformStudioItem[] {
  const mult = direction === 'asc' ? 1 : -1;
  return [...studios].sort((a, b) => {
    if (column === 'studio') {
      return mult * a.name.localeCompare(b.name);
    }
    if (column === 'category') {
      const catA = formatPlanCategory(a.subscription?.plan);
      const catB = formatPlanCategory(b.subscription?.plan);
      return mult * catA.localeCompare(catB);
    }
    if (column === 'plan') {
      const planA = formatPlanDetails(a.subscription?.plan);
      const planB = formatPlanDetails(b.subscription?.plan);
      return mult * planA.localeCompare(planB);
    }
    if (column === 'startsAt') {
      const tA = a.subscription?.startsAt ? new Date(a.subscription.startsAt).getTime() : 0;
      const tB = b.subscription?.startsAt ? new Date(b.subscription.startsAt).getTime() : 0;
      return mult * (tA - tB);
    }
    if (column === 'expiresAt' || column === 'remaining') {
      const tA = a.subscription?.expiresAt ? new Date(a.subscription.expiresAt).getTime() : 0;
      const tB = b.subscription?.expiresAt ? new Date(b.subscription.expiresAt).getTime() : 0;
      return mult * (tA - tB);
    }
    return 0;
  });
}
