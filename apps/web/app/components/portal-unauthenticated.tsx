'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { LoginForm } from './login-form';
import { OwnerLoginOtpForm } from './owner-login-otp-form';
import { OwnerRegisterForm } from './owner-register-form';

interface PortalUnauthenticatedProps {
  errorBanner: string | null;
  onSuccess: (auth: AuthResponse) => void;
  initialMode?: 'password' | 'email_otp' | 'register';
}

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
    <div>
      {errorBanner && (
        <div
          role="alert"
          style={{
            maxWidth: '420px',
            margin: '1rem auto',
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
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
          <div
            style={{
              maxWidth: '400px',
              margin: '0.5rem auto',
              textAlign: 'center',
              fontSize: '0.8125rem',
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMode('email_otp')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Owner Email OTP Sign In
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                padding: 0,
              }}
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
