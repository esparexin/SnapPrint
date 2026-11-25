'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import {
  deletePlatformSubscriptionPlan,
  listPlatformSubscriptionPlans,
} from '../../src/platform-plans-client';
import { AdminPlanModal } from './admin-plan-modal';
import { AdminPlansTableRow } from './admin-plans-table-row';

export function AdminPlansView() {
  const [plans, setPlans] = useState<SubscriptionPlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDefinition | null | 'new'>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPlatformSubscriptionPlans();
      setPlans(res.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleDelete = async (plan: SubscriptionPlanDefinition) => {
    if (!window.confirm(`Are you sure you want to delete or retire plan "${plan.name}"?`)) return;
    try {
      await deletePlatformSubscriptionPlan(plan.id);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  return (
    <div style={styles.container}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Subscription Plans Catalog
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Configure, edit days (30, 31, 32+), and set pricing for tenant tiers
          </p>
        </div>
        <button type="button" onClick={() => setSelectedPlan('new')} style={styles.btnAssign}>
          + Add New Plan
        </button>
      </div>

      {error && (
        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PLAN NAME</th>
              <th style={styles.th}>CATEGORY</th>
              <th style={styles.th}>DURATION</th>
              <th style={styles.th}>PRICE</th>
              <th style={styles.th}>STATUS</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.tdEmpty}>
                  Loading plans catalog...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.tdEmpty}>
                  No plans configured.
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <AdminPlansTableRow
                  key={p.id}
                  plan={p}
                  onEdit={setSelectedPlan}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPlan && (
        <AdminPlanModal
          plan={selectedPlan === 'new' ? null : selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSaved={() => {
            setSelectedPlan(null);
            loadPlans();
          }}
        />
      )}
    </div>
  );
}
