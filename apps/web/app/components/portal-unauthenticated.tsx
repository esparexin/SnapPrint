'use client';

import React, { CSSProperties, useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { OwnerLoginOtpForm } from './owner-login-otp-form';
import { OwnerRegisterForm } from './owner-register-form';

/**
 * ARCHITECTURAL RULE & SSOT:
 * SnapPrint exclusively uses passwordless Email OTP authentication for operators and owners.
 * Interactive password authentication is disabled across all user-facing flows.
 * DO NOT use or re-enable email + password authentication anywhere in user flows.
 */

interface PortalUnauthenticatedProps {
  errorBanner: string | null;
  onSuccess: (auth: AuthResponse) => void;
  initialMode?: 'email_otp' | 'register';
}

const cardStyle: CSSProperties = {
  maxWidth: '440px',
  width: '100%',
  margin: '2rem auto',
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
  padding: '2rem 1.5rem',
  boxSizing: 'border-box',
};

export function PortalUnauthenticated({
  errorBanner,
  onSuccess,
  initialMode = 'email_otp',
}: PortalUnauthenticatedProps) {
  const [authMode, setAuthMode] = useState<'email_otp' | 'register'>(initialMode);
  const [prefilledEmail, setPrefilledEmail] = useState('');

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  return (
    <div style={cardStyle}>
      {errorBanner && (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {errorBanner}
        </div>
      )}

      {authMode === 'register' ? (
        <OwnerRegisterForm
          initialEmail={prefilledEmail}
          onSuccess={onSuccess}
          onSwitchToLogin={() => setAuthMode('email_otp')}
        />
      ) : (
        <OwnerLoginOtpForm
          onSuccess={onSuccess}
          onSwitchToRegister={(email) => {
            if (email) setPrefilledEmail(email);
            setAuthMode('register');
          }}
        />
      )}
    </div>
  );
}
