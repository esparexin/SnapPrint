'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse, OTP_LENGTH, OtpCodeSchema, z } from '@snapprint/contracts';
import { AuthApiError, requestOwnerLoginOtp, verifyOwnerLoginOtp } from '../../src/auth-client';
import { OtpInputStep } from './otp-input-step';
import { OwnerLoginEmailStep } from './owner-login-email-step';
import { ownerLoginOtpStyles as s } from './owner-login-otp-styles';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) return err.message;
  if (err instanceof z.ZodError) return err.issues[0]?.message || 'Invalid email address.';
  return fallback;
}

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
      const auth = await verifyOwnerLoginOtp({ email, code: parsedCode.data });
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
      setCooldown(res.retryAfterSeconds);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToEmail = () => {
    setStep('email');
    setErrorMessage(null);
    setIsUnregistered(false);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      <img src="/brand/snapprint-icon.png" alt="SnapPrint" style={s.logo} />
      <h2 style={s.title}>OTP Sign In</h2>
      {step === 'email' ? (
        <p style={s.emailSubtitle}>Sign in with a one-time verification code sent to your email.</p>
      ) : (
        <div role="status" style={s.statusLine}>
          <span style={s.checkMark} aria-hidden="true">
            ✓
          </span>
          <span>
            OTP sent to <strong style={{ color: '#0f172a' }}>{email}</strong>
          </span>
          <button
            type="button"
            onClick={resetToEmail}
            title="Edit email"
            aria-label="Edit email"
            style={s.editBtn}
          >
            ✎
          </button>
        </div>
      )}

      {errorMessage && (
        <div role="alert" style={s.alert}>
          <div>{errorMessage}</div>
          {isUnregistered && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => onSwitchToRegister(email)}
                style={s.registerLink}
              >
                Register your shop now →
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'email' ? (
        <OwnerLoginEmailStep
          email={email}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onSubmit={handleRequestOtp}
        />
      ) : (
        <OtpInputStep
          otpCode={otpCode}
          onOtpCodeChange={setOtpCode}
          onSubmit={handleVerifyOtp}
          onBack={resetToEmail}
          onResend={handleResend}
          cooldown={cooldown}
          isSubmitting={isSubmitting}
          submitLabel="Sign In with Code"
          hideBack
        />
      )}

      <div style={s.footer}>
        <span style={{ color: '#64748b' }}>New print store?</span>
        <button type="button" onClick={() => onSwitchToRegister(email)} style={s.footerBtn}>
          Register
        </button>
      </div>
    </div>
  );
}
