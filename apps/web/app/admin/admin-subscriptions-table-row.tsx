'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import {
  formatDaysRemaining,
  formatPlanLabel,
  getSubscriptionBadgeStyle,
  getSubscriptionStatusLabel,
  SubscriptionBadgeState,
} from './admin-subscription-helpers';

export function AdminSubscriptionsTableRow({
  studio,
  onInspect,
  onManageSubscription,
}: {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageSubscription: (studio: PlatformStudioItem) => void;
}) {
  const sub = studio.subscription;
  const badgeState: SubscriptionBadgeState = !sub
    ? 'none'
    : sub.status === 'active'
      ? 'active'
      : 'expired';
  const statusLabel = getSubscriptionStatusLabel(sub);
  const isEnrolled = Boolean(sub);

  return (
    <tr style={styles.tableRow} onClick={() => onInspect(studio)}>
      <td style={styles.tdBold}>{studio.name}</td>
      <td style={styles.td}>
        {isEnrolled ? (
          formatPlanLabel(sub?.plan)
        ) : (
          <span style={{ color: '#94a3b8' }}>None</span>
        )}
      </td>
      <td style={styles.td}>
        <span style={getSubscriptionBadgeStyle(badgeState)}>{statusLabel}</span>
      </td>
      <td style={styles.td}>{formatDaysRemaining(sub?.expiresAt, badgeState === 'active')}</td>
      <td style={styles.td}>
        {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
      </td>
      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onManageSubscription(studio)}
          style={{
            padding: '0.25rem 0.65rem',
            minHeight: '44px',
            backgroundColor: isEnrolled ? '#e0f2fe' : '#f0fdf4',
            color: isEnrolled ? '#0369a1' : '#15803d',
            border: `1px solid ${isEnrolled ? '#bae6fd' : '#bbf7d0'}`,
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isEnrolled ? '⚡ Manage Plan' : '⚡ Assign Plan'}
        </button>
      </td>
    </tr>
  );
}
