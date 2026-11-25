'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import {
  formatDaysRemaining,
  formatPlanLabel,
  getSubscriptionBadgeStyle,
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
  const isActive = sub?.status === 'active';

  return (
    <tr style={styles.tableRow} onClick={() => onInspect(studio)}>
      <td style={styles.tdBold}>{studio.name}</td>
      <td style={styles.td}>{formatPlanLabel(sub?.plan)}</td>
      <td style={styles.td}>
        <span style={getSubscriptionBadgeStyle(isActive)}>{isActive ? 'Active' : 'Expired'}</span>
      </td>
      <td style={styles.td}>{formatDaysRemaining(sub?.expiresAt, isActive)}</td>
      <td style={styles.td}>
        {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
      </td>
      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onManageSubscription(studio)}
          style={{
            padding: '0.25rem 0.5rem',
            minHeight: '44px',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⚡ Manage Plan
        </button>
      </td>
    </tr>
  );
}
