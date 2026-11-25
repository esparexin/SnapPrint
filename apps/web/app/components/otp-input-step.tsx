'use client';

import React from 'react';
import { OTP_LENGTH } from '@snapprint/contracts';

interface OtpInputStepProps {
  otpCode: string;
  onOtpCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onResend: () => void;
  cooldown: number;
  isSubmitting: boolean;
  submitLabel: string;
  backLabel?: string;
  hideBack?: boolean;
}

export function OtpInputStep({
  otpCode,
  onOtpCodeChange,
  onSubmit,
  onBack,
  onResend,
  cooldown,
  isSubmitting,
  submitLabel,
  backLabel = 'Edit',
  hideBack = false,
}: OtpInputStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          htmlFor="otp-code-input"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          {OTP_LENGTH}-Digit Verification Code
        </label>
        <input
          id="otp-code-input"
          type="text"
          maxLength={OTP_LENGTH}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otpCode}
          onChange={(e) => onOtpCodeChange(e.target.value.replace(/\D/g, ''))}
          required
          disabled={isSubmitting}
          autoFocus
          placeholder="123456"
          style={{
            width: '100%',
            padding: '0.625rem',
            fontSize: '1.25rem',
            letterSpacing: '0.25rem',
            textAlign: 'center',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || otpCode.length !== OTP_LENGTH}
        style={{
          width: '100%',
          padding: '0.625rem',
          background: '#16a34a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 500,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginBottom: '0.75rem',
        }}
      >
        {isSubmitting ? 'Verifying...' : submitLabel}
      </button>
      <div
        style={{
          display: 'flex',
          justifyContent: hideBack ? 'flex-end' : 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
        }}
      >
        {!hideBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 500,
            }}
          >
            {backLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            color: cooldown > 0 ? '#9ca3af' : '#2563eb',
            cursor: cooldown > 0 ? 'default' : 'pointer',
            padding: 0,
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>
    </form>
  );
}
