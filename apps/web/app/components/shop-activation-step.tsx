'use client';

import React, { useState } from 'react';
import { canActivateShop } from '@snapprint/domain';
import { activateStudio, StudioApiError, StudioOnboardingProfile } from '../../src/studio-client';

interface ShopActivationStepProps {
  studio: StudioOnboardingProfile;
  onActivated: (result: { studioId: string; status: string; publicUrl: string }) => void;
  onBack: () => void;
}

export function ShopActivationStep({ studio, onActivated, onBack }: ShopActivationStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readiness = canActivateShop({
    name: studio.name,
    slug: studio.slug,
    city: studio.location?.city,
  });

  const handleActivate = async () => {
    if (!confirmed) {
      setError('Please check the confirmation box to verify operational readiness.');
      return;
    }
    setError(null);
    setActivating(true);
    try {
      const res = await activateStudio(studio.id, { confirmReady: true });
      onActivated(res);
    } catch (err) {
      setError(err instanceof StudioApiError ? err.message : 'Failed to activate studio.');
    } finally {
      setActivating(false);
    }
  };

  const autoPrintLimit = studio.capabilities?.autoPrintMaxPages ?? 30;
  const isRazorpay = studio.payment?.isRazorpayConfirmed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
          Onboarding Review & Summary
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <div>
            <strong style={{ color: '#475569' }}>Shop Name:</strong>
            <p style={{ margin: '0.125rem 0 0', fontWeight: 600 }}>{studio.name}</p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Customer Link:</strong>
            <p style={{ margin: '0.125rem 0 0', fontWeight: 600, color: '#0284c7' }}>
              /s/{studio.slug}
            </p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Location:</strong>
            <p style={{ margin: '0.125rem 0 0' }}>{studio.location?.city || 'Not specified'}</p>
          </div>
          <div>
            <strong style={{ color: '#475569' }}>Auto-Print Limit:</strong>
            <p style={{ margin: '0.125rem 0 0' }}>Up to {autoPrintLimit} pages</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong style={{ color: '#475569' }}>Active Payment Options:</strong>
            <p style={{ margin: '0.125rem 0 0' }}>
              ✓ Pay at Counter (Cash / UPI)
              {isRazorpay ? ' + ✓ Online Payment (Razorpay Confirmed)' : ' (Cash Only)'}
            </p>
          </div>
        </div>
      </div>

      {!readiness.canActivate ? (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            color: '#991b1b',
            fontSize: '0.8125rem',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
            Shop is not ready for activation:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {readiness.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            background: '#f0fdf4',
            borderRadius: '0.375rem',
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: '0.25rem' }}
          />
          <span style={{ fontSize: '0.875rem', color: '#166534', fontWeight: 500 }}>
            I confirm my printing counter is operational, my hardware is ready, and I agree to
            process incoming print jobs.
          </span>
        </label>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.5rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.25rem',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleActivate}
          disabled={activating || !readiness.canActivate || !confirmed}
          style={{
            padding: '0.5rem 1.5rem',
            background: activating || !readiness.canActivate || !confirmed ? '#9ca3af' : '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 700,
            cursor: activating || !readiness.canActivate || !confirmed ? 'not-allowed' : 'pointer',
          }}
        >
          {activating ? 'Activating Shop...' : '🚀 Activate Shop & Go Live'}
        </button>
      </div>
    </div>
  );
}
