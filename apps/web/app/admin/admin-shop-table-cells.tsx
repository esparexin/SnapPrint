'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import {
  formatDaysRemaining,
  formatPlanLabel,
  getSubscriptionBadgeStyle,
} from './admin-subscription-helpers';
import { adminTableStyles } from './admin-table-styles';

export function AdminShopTableSubscriptionCell({
  subscription,
}: {
  subscription?: PlatformStudioItem['subscription'];
}) {
  const isSubActive = subscription?.status === 'active';
  if (!subscription) {
    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 500,
          color: '#94a3b8',
          backgroundColor: '#f8fafc',
          padding: '0.15rem 0.45rem',
          borderRadius: '0.25rem',
          border: '1px solid #e2e8f0',
        }}
      >
        Not Enrolled
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span style={getSubscriptionBadgeStyle(isSubActive)}>
          {isSubActive ? 'Active' : 'Expired'}
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
          {formatPlanLabel(subscription.plan)}
        </span>
      </div>
      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
        {formatDaysRemaining(subscription.expiresAt, isSubActive)}
      </span>
    </div>
  );
}

export function AdminShopTablePrintersCell({
  printerCount,
  payment,
}: {
  printerCount?: number;
  payment?: PlatformStudioItem['payment'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.15rem 0.45rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '0.25rem',
          backgroundColor: '#f1f5f9',
          color: '#334155',
          border: '1px solid #e2e8f0',
        }}
      >
        🖨️ {printerCount ?? 0} {printerCount === 1 ? 'Printer' : 'Printers'}
      </span>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {payment?.enableCounterPayment !== false && (
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: '0.25rem', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            Counter
          </span>
        )}
        {payment?.enableOnlinePayment && (
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: '0.25rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            Online
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminShopTableActionsCell({
  studio,
  onInspect,
  onManageSubscription,
  onManageStatus,
}: {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageSubscription?: (studio: PlatformStudioItem) => void;
  onManageStatus: (studio: PlatformStudioItem) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInspect(studio);
        }}
        style={{ ...adminTableStyles.input, cursor: 'pointer', backgroundColor: '#f8fafc', fontWeight: 500, padding: '0.35rem 0.55rem' }}
      >
        Details
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onManageSubscription) {
            onManageSubscription(studio);
          } else {
            onInspect(studio);
          }
        }}
        style={{ ...adminTableStyles.input, cursor: 'pointer', backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600, padding: '0.35rem 0.55rem' }}
        title="Extend or override subscription"
      >
        ⚡ Plan
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onManageStatus(studio);
        }}
        style={{ ...adminTableStyles.input, cursor: 'pointer', backgroundColor: '#ffffff', fontWeight: 500, padding: '0.35rem 0.55rem' }}
      >
        Status
      </button>
    </div>
  );
}
