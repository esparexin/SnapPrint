'use client';

import React, { useEffect, useState } from 'react';
import {
  AuthResponse,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  OtpCodeSchema,
  OTP_LENGTH,
  z,
} from '@snapprint/contracts';
import {
  AuthApiError,
  requestOwnerRegistrationOtp,
  verifyOwnerRegistrationOtp,
} from '../../src/auth-client';
import { OtpInputStep } from './otp-input-step';
import { OwnerRegisterDetailsStep } from './owner-register-details-step';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) return err.message;
  if (err instanceof z.ZodError) return err.issues[0]?.message || 'Invalid form input.';
  return fallback;
}

interface OwnerRegisterFormProps {
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToLogin: () => void;
}

export function OwnerRegisterForm({ onSuccess, onSwitchToLogin }: OwnerRegisterFormProps) {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

    if (!termsAccepted || !privacyAccepted) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestOwnerRegistrationOtp({
        name,
        email,
        phone,
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      });
      setDispatchMessage(res.message);
      setCooldown(res.retryAfterSeconds);
      setStep('otp');
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Registration request failed.'));
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
      const auth = await verifyOwnerRegistrationOtp({
        email,
        code: parsedCode.data,
      });
      onSuccess(auth);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Verification failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await requestOwnerRegistrationOtp({
        name,
        email,
        phone,
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      });
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
        Shop Registration
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' }}>
        {step === 'details'
          ? 'Create a verified owner account for your Xerox shop or print store.'
          : `${dispatchMessage} Check your inbox and enter the code if you receive one.`}
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

      {step === 'details' ? (
        <OwnerRegisterDetailsStep
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          privacyAccepted={privacyAccepted}
          setPrivacyAccepted={setPrivacyAccepted}
          isSubmitting={isSubmitting}
          onSubmit={handleRequestOtp}
        />
      ) : (
        <OtpInputStep
          otpCode={otpCode}
          onOtpCodeChange={setOtpCode}
          onSubmit={handleVerifyOtp}
          onBack={() => setStep('details')}
          onResend={handleResend}
          cooldown={cooldown}
          isSubmitting={isSubmitting}
          submitLabel="Verify & Complete Registration"
        />
      )}

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          marginTop: '1.25rem',
          paddingTop: '0.875rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
        }}
      >
        Already registered?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            fontWeight: 500,
            padding: 0,
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
