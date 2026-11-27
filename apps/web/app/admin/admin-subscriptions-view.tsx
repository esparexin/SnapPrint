'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import { AdminSubscriptionTierCards } from './admin-subscription-tier-cards';
import { AdminSubscriptionsTableRow } from './admin-subscriptions-table-row';
import { SUBSCRIPTION_COLUMNS, subFilterStyles } from './admin-subscription-helpers';
import { useAdminSubscriptions } from './use-admin-subscriptions';
import { AdminSubscriptionNotifyModals } from './admin-subscription-notify-modals';

export interface AdminSubscriptionsViewProps {
  studios: PlatformStudioItem[];
  loading: boolean;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageSubscription: (studio: PlatformStudioItem) => void;
}

export function AdminSubscriptionsView({
  studios,
  loading,
  onInspect,
  onManageSubscription,
}: AdminSubscriptionsViewProps) {
  const {
    query,
    setQuery,
    planFilter,
    setPlanFilter,
    sortCol,
    sortDir,
    handleSort,
    notifyMsg,
    pendingNotifyStudio,
    notifyError,
    notifying,
    counts,
    sorted,
    handleNotify,
    confirmNotify,
    cancelNotify,
    clearNotifyError,
  } = useAdminSubscriptions(studios);

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
        Tenant Subscriptions
      </h2>
      <AdminSubscriptionTierCards counts={counts} />
      {notifyMsg && <div style={subFilterStyles.notify}>{notifyMsg}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by studio name or slug..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={subFilterStyles.input}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={subFilterStyles.select}
        >
          <option value="all">All Tenants ({counts.total})</option>
          <option value="free">Free Plan Users ({counts.free})</option>
          <option value="paid">Paid Plan Users ({counts.paid})</option>
          <option value="none">Not Enrolled ({counts.none})</option>
          <option value="expired">Expired ({counts.expired})</option>
        </select>
      </div>

      <div style={styles.tableResponsive}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              {SUBSCRIPTION_COLUMNS.map((col) => {
                const isCurrent = sortCol === col.key;
                const icon = isCurrent ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
                return (
                  <th
                    key={col.key}
                    style={{ ...styles.th, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(col.key)}
                    title={`Sort by ${col.label}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {col.label}
                      <span
                        style={{ fontSize: '0.7rem', color: isCurrent ? '#0284c7' : '#94a3b8' }}
                      >
                        {icon}
                      </span>
                    </span>
                  </th>
                );
              })}
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={styles.tdEmpty}>
                  Loading subscriptions...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.tdEmpty}>
                  No subscriptions matching filters.
                </td>
              </tr>
            ) : (
              sorted.map((s) => (
                <AdminSubscriptionsTableRow
                  key={s.id}
                  studio={s}
                  onInspect={onInspect}
                  onManageSubscription={onManageSubscription}
                  onNotify={handleNotify}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminSubscriptionNotifyModals
        pendingStudio={pendingNotifyStudio}
        notifying={notifying}
        notifyError={notifyError}
        onConfirmNotify={confirmNotify}
        onCancelNotify={cancelNotify}
        onClearError={clearNotifyError}
      />
    </div>
  );
}
