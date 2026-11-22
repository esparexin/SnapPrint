'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse, z } from '@snapprint/contracts';
import { AuthApiError, requestOwnerLoginOtp, verifyOwnerLoginOtp } from '../../src/auth-client';
import { OtpInputStep } from './otp-input-step';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) return err.message;
  if (err instanceof z.ZodError) return err.issues[0]?.message || 'Invalid email address.';
  return fallback;
}

interface OwnerLoginOtpFormProps {
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToPasswordLogin: () => void;
  onSwitchToRegister: () => void;
}

export function OwnerLoginOtpForm({
  onSuccess,
  onSwitchToPasswordLogin,
  onSwitchToRegister,
}: OwnerLoginOtpFormProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    setIsSubmitting(true);
    try {
      const res = await requestOwnerLoginOtp({ email });
      setCooldown(res.retryAfterSeconds || 60);
      setStep('otp');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Login request failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await verifyOwnerLoginOtp({
        email,
        code: otpCode.trim(),
      });
      onSuccess(auth);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Invalid verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await requestOwnerLoginOtp({ email });
      setCooldown(res.retryAfterSeconds || 60);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to resend code.'));
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
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Owner Sign In</h2>
      <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1.25rem' }}>
        {step === 'email'
          ? 'Sign in with a one-time verification code sent to your email.'
          : `Enter the 6-digit code sent to ${email}.`}
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

      {step === 'email' ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="owner-email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
              }}
            >
              Business Email
            </label>
            <input
              id="owner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="owner@printshop.com"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.625rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Sending Code...' : 'Send Login Code'}
          </button>
        </form>
      ) : (
        <OtpInputStep
          otpCode={otpCode}
          onOtpCodeChange={setOtpCode}
          onSubmit={handleVerifyOtp}
          onBack={() => setStep('email')}
          onResend={handleResend}
          cooldown={cooldown}
          isSubmitting={isSubmitting}
          submitLabel="Sign In with Code"
        />
      )}

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          marginTop: '1.25rem',
          paddingTop: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.8125rem',
        }}
      >
        <button
          type="button"
          onClick={onSwitchToPasswordLogin}
          style={{
            background: 'none',
            border: 'none',
            color: '#4b5563',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Operator Password
        </button>
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            fontWeight: 500,
            padding: 0,
          }}
        >
          Register New Studio
        </button>
      </div>
    </div>
  );
}
