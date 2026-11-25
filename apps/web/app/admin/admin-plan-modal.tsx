'use client';

import React, { useState } from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import { adminTableStyles as styles } from './admin-table-styles';
import { createPlatformSubscriptionPlan, updatePlatformSubscriptionPlan } from '../../src/platform-plans-client';

export interface AdminPlanModalProps {
  plan: SubscriptionPlanDefinition | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminPlanModal({ plan, onClose, onSaved }: AdminPlanModalProps) {
  const isEditing = Boolean(plan);
  const [id, setId] = useState(plan?.id || '');
  const [name, setName] = useState(plan?.name || '');
  const [durationDays, setDurationDays] = useState(plan?.durationDays ? String(plan.durationDays) : '30');
  const [priceRupees, setPriceRupees] = useState(plan ? String(plan.priceRupees) : '0');
  const [category, setCategory] = useState<'free' | 'paid'>(plan?.category || 'paid');
  const [intervalMonths, setIntervalMonths] = useState(plan?.intervalMonths ? String(plan.intervalMonths) : '1');
  const [isActive, setIsActive] = useState(plan ? plan.isActive : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(durationDays, 10);
    const price = parseInt(priceRupees, 10);
    if (!name.trim()) return setError('Plan name is required.');
    if (isNaN(days) || days <= 0 || days > 3650) return setError('Duration must be between 1 and 3650 days.');
    if (isNaN(price) || price < 0) return setError('Price must be 0 or positive.');
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        durationDays: days,
        priceRupees: price,
        category,
        intervalMonths: intervalMonths ? parseInt(intervalMonths, 10) : undefined,
        isActive,
      };
      if (isEditing) {
        await updatePlatformSubscriptionPlan(plan!.id, payload);
      } else {
        if (!id.trim()) return setError('Plan identifier is required.');
        await createPlatformSubscriptionPlan({ ...payload, id: id.trim().toLowerCase() });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalContent, maxWidth: '480px' }}>
        <h3 style={styles.modalTitle}>{isEditing ? `Edit Plan: ${plan!.name}` : 'Add New Subscription Plan'}</h3>
        {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {!isEditing && (
            <div>
              <label style={styles.formLabel}>Plan Identifier (ID)</label>
              <input required placeholder="e.g. starter_32" value={id} onChange={(e) => setId(e.target.value)} style={styles.formControl} />
            </div>
          )}
          <div>
            <label style={styles.formLabel}>Plan Name</label>
            <input required placeholder="e.g. 32-Day Free Trial" value={name} onChange={(e) => setName(e.target.value)} style={styles.formControl} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={styles.formLabel}>Duration (Days)</label>
              <input type="number" min="1" max="3650" required value={durationDays} onChange={(e) => setDurationDays(e.target.value)} style={styles.formControl} />
            </div>
            <div>
              <label style={styles.formLabel}>Price (₹)</label>
              <input type="number" min="0" required value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} style={styles.formControl} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={styles.formLabel}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as 'free' | 'paid')} style={styles.formControl}>
                <option value="paid">Paid Plan</option>
                <option value="free">Free Plan</option>
              </select>
            </div>
            <div>
              <label style={styles.formLabel}>Interval</label>
              <select value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} style={styles.formControl}>
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Active & Visible to Studio Operators</span>
          </label>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
