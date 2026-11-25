'use client';

import React, { useMemo, useState } from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import { AdminSubscriptionTierCards } from './admin-subscription-tier-cards';
import { AdminSubscriptionsTableRow } from './admin-subscriptions-table-row';

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

  const counts = useMemo(() => {
    const c = { total: studios.length, active: 0, free: 0, paid: 0, expired: 0, none: 0 };
    for (const s of studios) {
      if (!s.subscription) c.none++;
      else if (s.subscription.status === 'active') {
        c.active++;
        if (s.subscription.plan === 'free') c.free++;
        else c.paid++;
      } else c.expired++;
    }
    return c;
  }, [studios]);

  const filtered = useMemo(() => {
    return studios.filter((s) => {
      const q = query.toLowerCase();
      const matchesQuery = !query || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
      const isEnrolled = Boolean(s.subscription);
      const isAct = s.subscription?.status === 'active';
      const isExp = s.subscription?.status === 'expired';
      const p = s.subscription?.plan;
      let matchesPlan = true;
      if (planFilter === 'active') matchesPlan = isAct;
      else if (planFilter === 'none') matchesPlan = !isEnrolled;
      else if (planFilter === 'free') matchesPlan = p === 'free' && isAct;
      else if (planFilter === 'paid') matchesPlan = isEnrolled && p !== 'free' && isAct;
      else if (planFilter === 'expired') matchesPlan = isExp;
      return matchesQuery && matchesPlan;
    });
  }, [studios, query, planFilter]);

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' }}>
        Tenant Plans & Subscriptions
      </h2>
      <AdminSubscriptionTierCards counts={counts} />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by studio name or slug..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: '1 1 200px', minHeight: '44px', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '1rem' }}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{ minHeight: '44px', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '1rem', backgroundColor: '#fff' }}
        >
          <option value="all">All Tenants ({counts.total})</option>
          <option value="active">Active Plans ({counts.active})</option>
          <option value="none">Not Enrolled ({counts.none})</option>
          <option value="free">Free Trial ({counts.free})</option>
          <option value="paid">Paid Plans ({counts.paid})</option>
          <option value="expired">Expired ({counts.expired})</option>
        </select>
      </div>

      <div style={styles.tableResponsive}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Studio</th>
              <th style={styles.th}>Plan Tier</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Duration Remaining</th>
              <th style={styles.th}>Expires At</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.tdEmpty}>Loading subscriptions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={styles.tdEmpty}>No subscriptions matching filters.</td></tr>
            ) : (
              filtered.map((s) => (
                <AdminSubscriptionsTableRow
                  key={s.id}
                  studio={s}
                  onInspect={onInspect}
                  onManageSubscription={onManageSubscription}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
