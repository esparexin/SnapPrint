'use client';

import React, { useState } from 'react';
import { ShopPaymentSettings } from '@snapprint/contracts';
import {
  StudioApiError,
  StudioOnboardingProfile,
  updateStudioProfile,
} from '../../src/studio-client';
import { ShopRazorpayForm } from './shop-razorpay-form';

interface ShopPaymentStepProps {
  studioId: string;
  initialPayment?: ShopPaymentSettings;
  onSuccess: (updatedStudio: StudioOnboardingProfile) => void;
  onBack: () => void;
}

export function ShopPaymentStep({
  studioId,
  initialPayment,
  onSuccess,
  onBack,
}: ShopPaymentStepProps) {
  const [isConfirmed, setIsConfirmed] = useState(initialPayment?.isRazorpayConfirmed ?? false);
  const [keyId, setKeyId] = useState(initialPayment?.razorpayKeyId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setSaving(true);
    try {
      const payment: ShopPaymentSettings = {
        enableCounterPayment: true,
        enableOnlinePayment: isConfirmed,
        isRazorpayConfirmed: isConfirmed,
        ...(keyId ? { razorpayKeyId: keyId.trim() } : {}),
      };
      const updated = await updateStudioProfile(studioId, { payment });
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof StudioApiError ? err.message : 'Failed to save payment settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          padding: '1rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1.125rem' }}>✓</span>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#15803d' }}>
            Pay at Counter / Cash Only (Default Active)
          </h3>
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#166534' }}>
          Customers scan your QR, upload files, and order without paying online. You verify the job
          at your counter, collect cash or local UPI, and approve the print release.
        </p>
      </div>

      <ShopRazorpayForm
        studioId={studioId}
        isConfirmed={isConfirmed}
        keyId={keyId}
        onKeyIdChange={setKeyId}
        onVerificationSuccess={() => setIsConfirmed(true)}
        onError={setError}
      />

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
          onClick={handleContinue}
          disabled={saving}
          style={{
            padding: '0.5rem 1.25rem',
            background: saving ? '#9ca3af' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Review & Activate Shop →'}
        </button>
      </div>
    </div>
  );
}
