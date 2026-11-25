'use client';

import React, { CSSProperties, useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { LoginForm } from './login-form';
import { OwnerLoginOtpForm } from './owner-login-otp-form';
import { OwnerRegisterForm } from './owner-register-form';

interface PortalUnauthenticatedProps {
  errorBanner: string | null;
  onSuccess: (auth: AuthResponse) => void;
  initialMode?: 'password' | 'email_otp' | 'register';
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

const switchRowStyle: CSSProperties = {
  maxWidth: '400px',
  margin: '0.5rem auto',
  textAlign: 'center',
  fontSize: '0.8125rem',
};

const switchLinkBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  padding: 0,
};

export function PortalUnauthenticated({
  errorBanner,
  onSuccess,
  initialMode = 'email_otp',
}: PortalUnauthenticatedProps) {
  const [authMode, setAuthMode] = useState<'password' | 'email_otp' | 'register'>(initialMode);
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
      ) : authMode === 'password' ? (
        <div>
          <LoginForm onSuccess={onSuccess} />
          <div style={switchRowStyle}>
            <button
              type="button"
              onClick={() => setAuthMode('email_otp')}
              style={switchLinkBtnStyle}
            >
              Owner Email OTP Sign In
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={switchLinkBtnStyle}
            >
              Register
            </button>
          </div>
        </div>
      ) : (
        <OwnerLoginOtpForm
          onSuccess={onSuccess}
          onSwitchToPasswordLogin={() => setAuthMode('password')}
          onSwitchToRegister={(email) => {
            if (email) setPrefilledEmail(email);
            setAuthMode('register');
          }}
        />
      )}
    </div>
  );
}
