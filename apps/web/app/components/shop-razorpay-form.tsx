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
    <div
      className={`p-4 rounded-lg border ${
        isConfirmed ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="m-0 text-base font-semibold">Online Payment via Razorpay</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            isConfirmed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isConfirmed ? '✓ Confirmed Active' : 'Unconfirmed (Cash-Only Mode)'}
        </span>
      </div>
      <p className="m-0 mb-3 text-xs text-slate-500">
        Online payments are strictly enabled only after verifying your Razorpay credentials.
      </p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="rzp-key" className="block text-xs font-medium mb-1">
              Razorpay Key ID
            </label>
            <input
              id="rzp-key"
              type="text"
              value={keyId}
              onChange={(e) => onKeyIdChange(e.target.value)}
              placeholder="rzp_test_..."
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-base md:text-sm box-border"
            />
          </div>
          <div>
            <label htmlFor="rzp-secret" className="block text-xs font-medium mb-1">
              Razorpay Key Secret
            </label>
            <input
              id="rzp-secret"
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-base md:text-sm box-border"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || !keyId || !keySecret}
          className={`self-start px-3 py-1.5 text-white rounded text-xs font-medium ${
            verifying || !keyId || !keySecret
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
        >
          {verifying ? 'Verifying Gateway...' : 'Verify Gateway Handshake'}
        </button>
      </div>
      {verifySuccess && <p className="text-green-600 text-xs mt-2 font-medium">{verifySuccess}</p>}
    </div>
  );
}
