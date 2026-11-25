'use client';

import React, { useMemo, useState } from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import { AdminSubscriptionTierCards } from './admin-subscription-tier-cards';
import { AdminSubscriptionsTableRow } from './admin-subscriptions-table-row';
import { computeTierCounts, filterStudiosByPlan } from './admin-subscription-helpers';
import { notifyStudioSubscription } from '../../src/platform-plans-client';

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
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const counts = useMemo(() => computeTierCounts(studios), [studios]);
  const filtered = useMemo(
    () => filterStudiosByPlan(studios, query, planFilter),
    [studios, query, planFilter]
  );

  const handleNotify = async (studio: PlatformStudioItem) => {
    if (!window.confirm(`Trigger subscription notice email for "${studio.name}"?`)) return;
    try {
      await notifyStudioSubscription(studio.id);
      setNotifyMsg(`Notification email queued successfully for ${studio.name}`);
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to queue notification');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
        Tenant Subscriptions
      </h2>
      <AdminSubscriptionTierCards counts={counts} />
      {notifyMsg && (
        <div
          style={{
            color: '#15803d',
            backgroundColor: '#f0fdf4',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          {notifyMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by studio name or slug..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: '1 1 200px',
            minHeight: '44px',
            padding: '0.5rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '1rem',
          }}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{
            minHeight: '44px',
            padding: '0.5rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            backgroundColor: '#fff',
          }}
        >
          <option value="all">All Tenants ({counts.total})</option>
          <option value="free">Free Plan Users ({counts.free})</option>
          <option value="paid">Paid Plan Users ({counts.paid})</option>
          <option value="1mo">1 Month ({counts.oneMonth})</option>
          <option value="3mo">3 Months ({counts.threeMonths})</option>
          <option value="6mo">6 Months ({counts.sixMonths})</option>
          <option value="12mo">12 Months ({counts.twelveMonths})</option>
          <option value="none">Not Enrolled ({counts.none})</option>
          <option value="expired">Expired ({counts.expired})</option>
        </select>
      </div>

      <div style={styles.tableResponsive}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Studio</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Plan Details</th>
              <th style={styles.th}>Plan Date</th>
              <th style={styles.th}>Expires At</th>
              <th style={styles.th}>Remaining</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.tdEmpty}>
                  No subscriptions matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
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
    </div>
  );
}
