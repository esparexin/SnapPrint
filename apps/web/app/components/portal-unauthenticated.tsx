'use client';

import React from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { LoginForm } from './login-form';

interface PortalUnauthenticatedProps {
  errorBanner: string | null;
  onSuccess: (auth: AuthResponse) => void;
}

export function PortalUnauthenticated({ errorBanner, onSuccess }: PortalUnauthenticatedProps) {
  return (
    <div>
      {errorBanner && (
        <div
          role="alert"
          style={{
            maxWidth: '400px',
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
      <LoginForm onSuccess={onSuccess} />
    </div>
  );
}
