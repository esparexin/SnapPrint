'use client';

import React from 'react';
import { StudioSubscriptionRecord } from '@snapprint/contracts';
import {
  formatDaysRemaining,
  formatPlanLabel,
  getSubscriptionBadgeStyle,
} from '../admin/admin-subscription-helpers';

interface StatusCardProps {
  subscription: StudioSubscriptionRecord | null;
  activatingTrial: boolean;
  onActivateTrial: () => void;
}

export function StudioSubscriptionStatusCard({
  subscription,
  activatingTrial,
  onActivateTrial,
}: StatusCardProps) {
  const isTrial = subscription?.plan === 'free';
  const isActive = subscription?.status === 'active';

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>CURRENT PLAN</div>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#0f172a',
              marginTop: '0.125rem',
            }}
          >
            {formatPlanLabel(subscription?.plan)}
            {isTrial && ' (Free Trial)'}
          </div>
        </div>
        <span style={getSubscriptionBadgeStyle(isActive)}>{isActive ? 'Active' : 'Expired'}</span>
      </div>

      <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.5rem' }}>
        {subscription?.expiresAt
          ? `${formatDaysRemaining(subscription.expiresAt, isActive)} · Expires ${new Date(
              subscription.expiresAt
            ).toLocaleDateString()}`
          : 'No active subscription. Choose a plan below or activate your free trial.'}
      </div>

      {!subscription && (
        <button
          type="button"
          onClick={onActivateTrial}
          disabled={activatingTrial}
          style={{
            marginTop: '0.75rem',
            width: '100%',
            minHeight: '44px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: activatingTrial ? 'not-allowed' : 'pointer',
          }}
        >
          {activatingTrial ? 'Activating...' : '🎉 Activate 30-Day Free Trial'}
        </button>
      )}
    </div>
  );
}
