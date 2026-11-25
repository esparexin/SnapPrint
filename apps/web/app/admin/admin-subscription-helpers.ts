import { CSSProperties } from 'react';

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
