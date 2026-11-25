'use client';

import React, { useState } from 'react';
import { StudioApiError, verifyStudioRazorpay } from '../../src/studio-client';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.375rem 0.5rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
};

const getVerifyBtnStyle = (verifying: boolean): React.CSSProperties => ({
  alignSelf: 'flex-start',
  padding: '0.375rem 0.75rem',
  background: verifying ? '#9ca3af' : '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: verifying ? 'not-allowed' : 'pointer',
});

interface ShopRazorpayFormProps {
  studioId: string;
  isConfirmed: boolean;
  keyId: string;
  onKeyIdChange: (key: string) => void;
  onVerificationSuccess: (msg: string) => void;
  onError: (err: string | null) => void;
}

export function ShopRazorpayForm({
  studioId,
  isConfirmed,
  keyId,
  onKeyIdChange,
  onVerificationSuccess,
  onError,
}: ShopRazorpayFormProps) {
  const [keySecret, setKeySecret] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  const handleVerify = async () => {
    onError(null);
    setVerifySuccess(null);
    if (!keyId.trim() || !keySecret.trim()) {
      onError('Please provide both Razorpay Key ID and Secret.');
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyStudioRazorpay(studioId, {
        keyId: keyId.trim(),
        keySecret: keySecret.trim(),
      });
      if (res.isConfirmed) {
        setVerifySuccess(res.message);
        onVerificationSuccess(res.message);
      }
    } catch (err) {
      onError(err instanceof StudioApiError ? err.message : 'Gateway handshake failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      style={{
        padding: '1rem',
        background: isConfirmed ? '#eff6ff' : '#f8fafc',
        border: `1px solid ${isConfirmed ? '#bfdbfe' : '#e2e8f0'}`,
        borderRadius: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          Online Payment via Razorpay
        </h3>
        <span
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: isConfirmed ? '#dcfce7' : '#f1f5f9',
            color: isConfirmed ? '#15803d' : '#64748b',
          }}
        >
          {isConfirmed ? '✓ Confirmed Active' : 'Unconfirmed (Cash-Only Mode)'}
        </span>
      </div>

      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
        Online payments are strictly enabled only after verifying your Razorpay credentials.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label htmlFor="rzp-key" style={labelStyle}>
              Razorpay Key ID
            </label>
            <input
              id="rzp-key"
              type="text"
              value={keyId}
              onChange={(e) => onKeyIdChange(e.target.value)}
              placeholder="rzp_test_..."
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="rzp-secret" style={labelStyle}>
              Razorpay Key Secret
            </label>
            <input
              id="rzp-secret"
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="••••••••••••"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || !keyId || !keySecret}
          style={getVerifyBtnStyle(verifying)}
        >
          {verifying ? 'Verifying Gateway...' : 'Verify Gateway Handshake'}
        </button>
      </div>
      {verifySuccess && (
        <p
          style={{ color: '#16a34a', fontSize: '0.8125rem', margin: '0.5rem 0 0', fontWeight: 500 }}
        >
          {verifySuccess}
        </p>
      )}
    </div>
  );
}
