'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse, CURRENT_PRIVACY_POLICY_VERSION, CURRENT_TERMS_VERSION } from '@snapprint/contracts';
import {
  AuthApiError,
  requestOwnerRegistrationOtp,
  verifyOwnerRegistrationOtp,
} from '../../src/auth-client';

interface OwnerRegisterFormProps {
  onSuccess: (auth: AuthResponse) => void;
  onSwitchToLogin: () => void;
}

export function OwnerRegisterForm({ onSuccess, onSwitchToLogin }: OwnerRegisterFormProps) {
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
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
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      });
      setCooldown(res.retryAfterSeconds || 60);
      setStep('otp');
    } catch (err) {
      setErrorMessage(err instanceof AuthApiError ? err.message : 'Registration request failed.');
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
      const auth = await verifyOwnerRegistrationOtp({
        email,
        code: otpCode.trim(),
      });
      onSuccess(auth);
    } catch (err) {
      setErrorMessage(err instanceof AuthApiError ? err.message : 'Verification failed.');
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
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      });
      setCooldown(res.retryAfterSeconds || 60);
    } catch (err) {
      setErrorMessage(err instanceof AuthApiError ? err.message : 'Failed to resend code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Studio Registration</h2>
      <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1.25rem' }}>
        {step === 'details' ? 'Create a verified owner account for your print studio.' : `Enter the 6-digit code sent to ${email}.`}
      </p>

      {errorMessage && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {errorMessage}
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <div style={{ marginBottom: '0.875rem' }}>
            <label htmlFor="reg-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Your Full Name</label>
            <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} placeholder="e.g. Rajesh Kumar" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '0.875rem' }}>
            <label htmlFor="reg-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Business Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} placeholder="owner@printshop.com" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '0.875rem' }}>
            <label htmlFor="reg-phone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Mobile Number (with country code)</label>
            <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isSubmitting} placeholder="+919876543210" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              I agree to the Terms of Service (v{CURRENT_TERMS_VERSION})
            </label>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}>
              <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              I agree to the Privacy Policy (v{CURRENT_PRIVACY_POLICY_VERSION})
            </label>
          </div>
          <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '0.625rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} noValidate>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="reg-otp" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>6-Digit Verification Code</label>
            <input id="reg-otp" type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} required disabled={isSubmitting} autoFocus placeholder="123456" style={{ width: '100%', padding: '0.625rem', fontSize: '1.25rem', letterSpacing: '0.25rem', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={isSubmitting || otpCode.length < 6} style={{ width: '100%', padding: '0.625rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginBottom: '0.75rem' }}>
            {isSubmitting ? 'Verifying...' : 'Verify & Complete Registration'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
            <button type="button" onClick={() => setStep('details')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>Back</button>
            <button type="button" onClick={handleResend} disabled={cooldown > 0 || isSubmitting} style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#9ca3af' : '#2563eb', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', padding: 0 }}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1.25rem', paddingTop: '0.875rem', textAlign: 'center', fontSize: '0.8125rem' }}>
        Already registered?{' '}
        <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
          Sign In
        </button>
      </div>
    </div>
  );
}

