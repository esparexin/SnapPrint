'use client';

import React, { useState } from 'react';
import { AuthResponse, LoginRequestSchema } from '@snapprint/contracts';
import { AuthApiError, loginOperator } from '../../src/auth-client';

interface LoginFormProps {
  onSuccess: (auth: AuthResponse) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    const parseResult = LoginRequestSchema.safeParse({ email, password });
    if (!parseResult.success) {
      setErrorMessage(parseResult.error.issues[0]?.message || 'Invalid credentials format');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await loginOperator({ email, password });
      onSuccess(auth);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred during login. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '2rem auto',
        padding: '1.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 1rem' }}>Operator Sign In</h2>
      <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1.5rem' }}>
        Access your photo printing studio management portal.
      </p>

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="operator-email"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Email Address
          </label>
          <input
            id="operator-email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={isSubmitting}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="operator-password"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="operator-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem 3.5rem 0.5rem 0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: '#4b5563',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.625rem',
            background: isSubmitting ? '#9ca3af' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
