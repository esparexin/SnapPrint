'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import {
  formatDaysRemaining,
  formatPlanCategory,
  formatPlanIntervalDetails,
  getSubscriptionBadgeStyle,
  getSubscriptionStatusLabel,
  SubscriptionBadgeState,
} from './admin-subscription-helpers';

export function AdminSubscriptionsTableRow({
  studio,
  onInspect,
  onManageSubscription,
  onNotify,
}: {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageSubscription: (studio: PlatformStudioItem) => void;
  onNotify?: (studio: PlatformStudioItem) => void;
}) {
  const sub = studio.subscription;
  const badgeState: SubscriptionBadgeState = !sub
    ? 'none'
    : sub.status === 'active'
      ? 'active'
      : 'expired';
  const statusLabel = getSubscriptionStatusLabel(sub);
  const isEnrolled = Boolean(sub);
  const category = formatPlanCategory(sub?.plan);

  return (
    <tr style={styles.tableRow} onClick={() => onInspect(studio)}>
      <td style={styles.tdBold}>{studio.name}</td>
      <td style={styles.td}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor:
              category === 'free' ? '#f0f9ff' : category === 'paid' ? '#eef2ff' : '#f1f5f9',
            color: category === 'free' ? '#0284c7' : category === 'paid' ? '#4f46e5' : '#64748b',
          }}
        >
          {category === 'free' ? 'Free Plan' : category === 'paid' ? 'Paid Plan' : 'Not Enrolled'}
        </span>
      </td>
      <td style={styles.td}>
        {isEnrolled ? (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>
              {formatPlanIntervalDetails(sub?.plan)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              <span style={getSubscriptionBadgeStyle(badgeState)}>{statusLabel}</span>
            </div>
          </div>
        ) : (
          <span style={{ color: '#94a3b8' }}>None</span>
        )}
      </td>
      <td style={styles.td}>{sub?.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '—'}</td>
      <td style={styles.td}>
        {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
      </td>
      <td style={styles.td}>{formatDaysRemaining(sub?.expiresAt, badgeState === 'active')}</td>
      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
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
          {onNotify && isEnrolled && (
            <button
              type="button"
              onClick={() => onNotify(studio)}
              title="Queue subscription notice email"
              style={{
                padding: '0.25rem 0.5rem',
                minHeight: '44px',
                backgroundColor: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✉️ Email
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
