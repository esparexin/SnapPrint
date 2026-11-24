'use client';

import React from 'react';
import { adminLayoutStyles } from './admin-layout-styles';
import { adminTableStyles } from './admin-table-styles';

export interface AdminLoginOtpStepProps {
  otp: string;
  loading: boolean;
  cooldown: number;
  attempts?: number;
  onOtpChange: (val: string) => void;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}

export function AdminLoginOtpStep({
  otp,
  loading,
  cooldown,
  attempts = 0,
  onOtpChange,
  onVerify,
  onResend,
  onChangeEmail,
}: AdminLoginOtpStepProps) {
  const isExhausted = attempts >= 3;
  return (
    <form onSubmit={onVerify}>
      <div style={adminTableStyles.formGroup}>
        <div style={adminLayoutStyles.modalHeader}>
          <label style={adminTableStyles.formLabel}>6-Digit Verification Code</label>
          <button
            type="button"
            onClick={onChangeEmail}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Change Email
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={loading || isExhausted}
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          required
          autoFocus
          style={{
            ...adminTableStyles.formControl,
            textAlign: 'center',
            fontSize: '1.25rem',
            letterSpacing: '0.3em',
            fontWeight: 700,
            opacity: isExhausted ? 0.5 : 1,
          }}
        />
      </div>
      <button
        type="submit"
        disabled={loading || otp.length !== 6 || isExhausted}
        style={{
          ...adminLayoutStyles.btnBlock,
          opacity: loading || otp.length !== 6 || isExhausted ? 0.6 : 1,
          marginBottom: '0.75rem',
        }}
      >
        {isExhausted
          ? 'Attempts Exhausted'
          : loading
            ? 'Verifying...'
            : 'Verify & Enter Admin Portal'}
      </button>
      <button
        type="button"
        disabled={cooldown > 0 || loading}
        onClick={onResend}
        style={{
          ...adminLayoutStyles.btnBlockSecondary,
          opacity: cooldown > 0 ? 0.5 : 1,
          fontSize: '0.75rem',
        }}
      >
        {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
      </button>
    </form>
  );
}
