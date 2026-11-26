'use client';

import React, { useState } from 'react';
import { StudioApiError, verifyStudioRazorpay } from '../../src/studio-client';

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
    <div className={`rzp-card ${isConfirmed ? 'rzp-card--confirmed' : ''}`}>
      <div className="rzp-header">
        <h3 className="rzp-title">Online Payment via Razorpay</h3>
        <span className={`rzp-badge ${isConfirmed ? 'rzp-badge--confirmed' : ''}`}>
          {isConfirmed ? '✓ Confirmed Active' : 'Unconfirmed (Cash-Only Mode)'}
        </span>
      </div>
      <p className="rzp-description">
        Online payments are strictly enabled only after verifying your Razorpay credentials.
      </p>
      <div>
        <div className="rzp-grid">
          <div className="rzp-field">
            <label htmlFor="rzp-key" className="rzp-label">
              Razorpay Key ID
            </label>
            <input
              id="rzp-key"
              type="text"
              value={keyId}
              onChange={(e) => onKeyIdChange(e.target.value)}
              placeholder="rzp_test_..."
              className="rzp-input"
            />
          </div>
          <div className="rzp-field">
            <label htmlFor="rzp-secret" className="rzp-label">
              Razorpay Key Secret
            </label>
            <input
              id="rzp-secret"
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="••••••••••••"
              className="rzp-input"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || !keyId || !keySecret}
          className="rzp-verify-btn"
        >
          {verifying ? 'Verifying Gateway...' : 'Verify Gateway Handshake'}
        </button>
      </div>
      {verifySuccess && <p className="rzp-success">{verifySuccess}</p>}
    </div>
  );
}
