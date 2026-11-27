'use client';

import React, { useState } from 'react';
import { SubscriptionPlanId } from '@snapprint/contracts';
import { ControlledNumericInput } from '../components/controlled-numeric-input';
import { overridePlatformStudioSubscription } from '../../src/platform-admin-client';
import { adminLayoutStyles } from './admin-layout-styles';
import { adminTableStyles } from './admin-table-styles';

export interface AdminSubscriptionOverrideFormProps {
  studioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PLAN_OPTIONS: Array<{ value: SubscriptionPlanId; label: string }> = [
  { value: 'quarterly', label: 'Quarterly Plan (90 Days)' },
  { value: 'half_yearly', label: 'Half-Yearly Plan (180 Days)' },
  { value: 'yearly', label: 'Yearly Plan (365 Days)' },
  { value: 'free', label: 'Free Trial (30 Days)' },
];

export function AdminSubscriptionOverrideForm({
  studioId,
  onSuccess,
  onCancel,
}: AdminSubscriptionOverrideFormProps) {
  const [plan, setPlan] = useState<SubscriptionPlanId>('quarterly');
  const [durationDays, setDurationDays] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) return setError('Audit reason (min 3 chars) is required.');
    const days = durationDays.trim() ? parseInt(durationDays.trim(), 10) : undefined;
    if (days !== undefined && (isNaN(days) || days <= 0 || days > 3650)) {
      return setError('Duration must be between 1 and 3650 days.');
    }
    setSubmitting(true);
    setError(null);
    try {
      await overridePlatformStudioSubscription(studioId, {
        plan,
        durationDays: days,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
    >
      {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}
      <div>
        <label style={adminTableStyles.formLabel}>Target Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as SubscriptionPlanId)}
          style={adminTableStyles.formControl}
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={adminTableStyles.formLabel}>
          Custom Duration (Days){' '}
          <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
        </label>
        <ControlledNumericInput
          min={1}
          max={3650}
          placeholder="Leave empty for standard duration"
          value={durationDays}
          onChange={(val) => setDurationDays(String(val))}
          style={adminTableStyles.formControl}
        />
      </div>
      <div>
        <label style={adminTableStyles.formLabel}>
          Audit Reason <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <textarea
          rows={2}
          required
          placeholder="e.g., VIP onboarding partner, promotional grant, SLA compensation"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={adminTableStyles.formTextarea}
        />
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          marginTop: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{ ...adminTableStyles.actionBtn, minHeight: '44px', padding: '0 1rem' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            ...adminTableStyles.primaryBtn,
            minHeight: '44px',
            padding: '0 1.25rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Applying...' : 'Apply Subscription'}
        </button>
      </div>
    </form>
  );
}
