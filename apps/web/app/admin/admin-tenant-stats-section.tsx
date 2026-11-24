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

export function AdminTenantStatsSection({
  subscription,
  printStats,
}: AdminTenantStatsSectionProps) {
  const isSubActive = subscription?.status === 'active';
  const planName = subscription?.plan ? PLAN_LABELS[subscription.plan] || subscription.plan : 'No Plan Assigned';
  const expiresText = subscription?.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
      {/* Subscription Card */}
      <div
        style={{
          padding: '0.875rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Subscription Status</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              backgroundColor: isSubActive ? '#ecfdf5' : '#fef2f2',
              color: isSubActive ? '#065f46' : '#991b1b',
              border: `1px solid ${isSubActive ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            {subscription ? (isSubActive ? 'Active' : 'Expired') : 'Not Enrolled'}
          </span>
        </div>
        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{planName}</div>
        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {expiresText ? (isSubActive ? `Expires on ${expiresText}` : `Expired on ${expiresText}`) : 'No active expiry date'}
        </div>
      </div>

      {/* Completed Print Volume Card */}
      <div
        style={{
          padding: '0.875rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Completed Print Volume</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            {printStats?.totalCompletedPrints ?? 0}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>total completed</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.75rem' }}>
          <span
            style={{
              padding: '0.15rem 0.4rem',
              borderRadius: '0.25rem',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              fontWeight: 500,
            }}
          >
            Color: <strong>{printStats?.colorPrints ?? 0}</strong>
          </span>
          <span
            style={{
              padding: '0.15rem 0.4rem',
              borderRadius: '0.25rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontWeight: 500,
            }}
          >
            B&W: <strong>{printStats?.bwPrints ?? 0}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
