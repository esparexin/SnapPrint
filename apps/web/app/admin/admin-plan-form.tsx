'use client';

import React from 'react';
import { SubscriptionPlanDefinition } from '@snapprint/contracts';
import { ControlledNumericInput } from '../components/controlled-numeric-input';
import { adminTableStyles as styles } from './admin-table-styles';
import { useAdminPlanForm } from './use-admin-plan-form';

export function AdminPlanForm({
  plan,
  onClose,
  onSaved,
}: {
  plan: SubscriptionPlanDefinition | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    isEditing,
    id,
    setId,
    name,
    setName,
    durationDays,
    setDurationDays,
    priceRupees,
    setPriceRupees,
    category,
    setCategory,
    intervalMonths,
    setIntervalMonths,
    isActive,
    setIsActive,
    loading,
    error,
    handleSubmit,
  } = useAdminPlanForm({ plan, onSaved });

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
    >
      {error && (
        <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>
      )}
      {!isEditing && (
        <div>
          <label style={styles.formLabel}>Plan Identifier (ID)</label>
          <input
            required
            placeholder="e.g. starter_32"
            value={id}
            onChange={(e) => setId(e.target.value)}
            style={styles.formControl}
          />
        </div>
      )}
      <div>
        <label style={styles.formLabel}>Plan Name</label>
        <input
          required
          placeholder="e.g. 32-Day Free Trial"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.formControl}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label style={styles.formLabel}>Duration (Days)</label>
          <ControlledNumericInput
            min={1}
            max={3650}
            required
            value={durationDays}
            onChange={(val) => setDurationDays(String(val))}
            style={styles.formControl}
          />
        </div>
        <div>
          <label style={styles.formLabel}>Price (₹)</label>
          <ControlledNumericInput
            min={0}
            required
            value={priceRupees}
            onChange={(val) => setPriceRupees(String(val))}
            style={styles.formControl}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <label style={styles.formLabel}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'free' | 'paid')}
            style={styles.formControl}
          >
            <option value="paid">Paid Plan</option>
            <option value="free">Free Plan</option>
          </select>
        </div>
        <div>
          <label style={styles.formLabel}>Interval</label>
          <select
            value={intervalMonths}
            onChange={(e) => setIntervalMonths(e.target.value)}
            style={styles.formControl}
          >
            <option value="1">1 Month</option>
            <option value="3">3 Months</option>
            <option value="6">6 Months</option>
            <option value="12">12 Months</option>
          </select>
        </div>
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.85rem',
        }}
      >
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span>Active & Visible to Studio Operators</span>
      </label>
      <div style={styles.modalActions}>
        <button type="button" onClick={onClose} style={styles.btnCancel}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={styles.btnPrimary}>
          {loading ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
}
