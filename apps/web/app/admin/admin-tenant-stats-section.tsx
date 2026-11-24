'use client';

import React from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';
import { AdminTenantPrintVolumeCard } from './admin-tenant-print-volume-card';

interface AdminTenantStatsSectionProps {
  subscription?: PlatformStudioDetailsResponse['subscription'];
  printStats?: PlatformStudioDetailsResponse['printStats'];
  onOverrideSubscription?: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free Trial (30 Days)',
  quarterly: 'Quarterly Plan (90 Days)',
  half_yearly: 'Half-Yearly Plan (180 Days)',
  yearly: 'Yearly Plan (365 Days)',
};

const cardStyle: React.CSSProperties = {
  padding: '0.875rem',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
};

const getBadgeStyle = (active: boolean): React.CSSProperties => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  backgroundColor: active ? '#ecfdf5' : '#fef2f2',
  color: active ? '#065f46' : '#991b1b',
  border: `1px solid ${active ? '#a7f3d0' : '#fecaca'}`,
});

export function AdminTenantStatsSection({
  subscription,
  printStats,
  onOverrideSubscription,
}: AdminTenantStatsSectionProps) {
  const isSubActive = subscription?.status === 'active';
  const planName = subscription?.plan
    ? PLAN_LABELS[subscription.plan] || subscription.plan
    : 'No Plan Assigned';

  let countdown = '';
  if (subscription?.expiresAt) {
    const diff = new Date(subscription.expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    countdown = isSubActive
      ? days > 0
        ? `(${days} days remaining)`
        : '(expires today)'
      : `(${Math.abs(days)} days ago)`;
  }

  const expiresText = subscription?.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const expiryLabel = expiresText
    ? `${isSubActive ? 'Expires' : 'Expired'}: ${expiresText} ${countdown}`
    : 'No active expiry date';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '0.75rem',
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 600, color: '#334155' }}>Subscription Status</span>
          <span style={getBadgeStyle(Boolean(isSubActive))}>
            {subscription ? (isSubActive ? 'Active' : 'Expired') : 'Not Enrolled'}
          </span>
        </div>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{planName}</div>
        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {expiryLabel}
        </div>
        {onOverrideSubscription && (
          <button
            type="button"
            onClick={onOverrideSubscription}
            style={{
              marginTop: '0.625rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.25rem',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
            }}
          >
            <span>⚡ Extend or Override Plan</span>
          </button>
        )}
      </div>

      <AdminTenantPrintVolumeCard printStats={printStats} />
    </div>
  );
}
