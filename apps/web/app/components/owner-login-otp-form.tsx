'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse, OTP_LENGTH, OtpCodeSchema, z } from '@snapprint/contracts';
import { AuthApiError, requestOwnerLoginOtp, verifyOwnerLoginOtp } from '../../src/auth-client';
import { OtpInputStep } from './otp-input-step';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) return err.message;
  if (err instanceof z.ZodError) return err.issues[0]?.message || 'Invalid email address.';
  return fallback;
}

const alertStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #f87171',
  color: '#991b1b',
  padding: '0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  marginBottom: '1rem',
};

const registerLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
  fontWeight: 600,
  textDecoration: 'underline',
  padding: 0,
  fontSize: '0.875rem',
};

interface OwnerLoginOtpFormProps {
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToPasswordLogin?: () => void;
  onSwitchToRegister: (prefilledEmail?: string) => void;
}

export function OwnerLoginOtpForm({ onSuccess, onSwitchToRegister }: OwnerLoginOtpFormProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnregistered, setIsUnregistered] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dispatchMessage, setDispatchMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsUnregistered(false);

    setIsSubmitting(true);
    try {
      const res = await requestOwnerLoginOtp({ email });
      setDispatchMessage(res.message);
      setCooldown(res.retryAfterSeconds);
      setStep('otp');
    } catch (err) {
      if (
        err instanceof AuthApiError &&
        (err.code === 'USER_NOT_REGISTERED' || err.statusCode === 404)
      ) {
        setIsUnregistered(true);
        onSwitchToRegister(email);
        return;
      }
      setErrorMessage(extractErrorMessage(err, 'Login request failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const parsedCode = OtpCodeSchema.safeParse(otpCode);
    if (!parsedCode.success) {
      setErrorMessage(`Please enter a valid ${OTP_LENGTH}-digit verification code.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await verifyOwnerLoginOtp({
        email,
        code: parsedCode.data,
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
      setDispatchMessage(res.message);
      setCooldown(res.retryAfterSeconds);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        margin: '0 auto',
      }}
    >
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
        OTP Sign In
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
        {step === 'email'
          ? 'Sign in with a one-time verification code sent to your email.'
          : `${dispatchMessage} Check your inbox and enter the code if you receive one.`}
      </p>

      {errorMessage && (
        <div role="alert" style={alertStyle}>
          <div>{errorMessage}</div>
          {isUnregistered && (
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={() => onSwitchToRegister(email)} style={registerLinkStyle}>
                Register your shop now →
              </button>
            </div>
          )}
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
          onBack={() => {
            setStep('email');
            setErrorMessage(null);
            setIsUnregistered(false);
          }}
          onResend={handleResend}
          cooldown={cooldown}
          isSubmitting={isSubmitting}
          submitLabel="Sign In with Code"
          backLabel="Edit"
        />
      )}

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          marginTop: '1.25rem',
          paddingTop: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8125rem',
        }}
      >
        <span style={{ color: '#64748b' }}>New print store?</span>
        <button
          type="button"
          onClick={() => onSwitchToRegister(email)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}
