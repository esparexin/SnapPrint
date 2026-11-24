'use client';

import React from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';

interface AdminTenantStatsSectionProps {
  subscription?: PlatformStudioDetailsResponse['subscription'];
  printStats?: PlatformStudioDetailsResponse['printStats'];
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

const chip = (bg: string, color: string): React.CSSProperties => ({
  padding: '0.15rem 0.4rem',
  borderRadius: '0.25rem',
  backgroundColor: bg,
  color,
  fontWeight: 500,
});

const progressBarStyle: React.CSSProperties = {
  display: 'flex',
  height: '5px',
  borderRadius: '9999px',
  overflow: 'hidden',
  marginTop: '0.5rem',
  backgroundColor: '#e2e8f0',
};

export function AdminTenantStatsSection({
  subscription,
  printStats,
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

  const total = printStats?.totalCompletedPrints ?? 0;
  const color = printStats?.colorPrints ?? 0;
  const bw = printStats?.bwPrints ?? 0;
  const colorPct = total > 0 ? Math.round((color / total) * 100) : 0;
  const bwPct = total > 0 ? 100 - colorPct : 0;
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
      {/* Subscription Card */}
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
      </div>

      {/* Completed Print Volume Card */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
          Completed Print Volume
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{total}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>total completed</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.75rem' }}>
          <span style={chip('#eff6ff', '#1e40af')}>
            Color: <strong>{color}</strong> {total > 0 && `(${colorPct}%)`}
          </span>
          <span style={chip('#f1f5f9', '#334155')}>
            B&W: <strong>{bw}</strong> {total > 0 && `(${bwPct}%)`}
          </span>
        </div>
        {total > 0 && (
          <div style={progressBarStyle}>
            <div style={{ width: `${colorPct}%`, backgroundColor: '#3b82f6' }} />
            <div style={{ width: `${bwPct}%`, backgroundColor: '#64748b' }} />
          </div>
        )}
      </div>
    </div>
  );
}
