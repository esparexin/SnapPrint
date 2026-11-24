'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { logoutOperator, requestOwnerLoginOtp, verifyOwnerLoginOtp } from '../../src/auth-client';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminLoginOtpStep } from './admin-login-otp-step';
import { adminTableStyles, getAuthErrorMessage } from './admin-table-styles';

export interface AdminLoginCardProps {
  onSuccess: (auth: AuthResponse) => void;
}

export function AdminLoginCard({ onSuccess }: AdminLoginCardProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ err?: string; info?: string }>({});

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 && step === 'otp') return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setNotice({ err: 'Please enter a valid administrator email address.' });
      return;
    }
    setLoading(true);
    setNotice({});
    try {
      await requestOwnerLoginOtp({ email: cleanEmail });
      setStep('otp');
      setOtp('');
      setAttempts(0);
      setCooldown(60);
      setNotice({ info: `A 6-digit verification code was sent to ${cleanEmail}.` });
    } catch (err) {
      setNotice({ err: getAuthErrorMessage(err, 'Failed to send verification code.') });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || attempts >= 3) return;
    setLoading(true);
    setNotice({});
    try {
      const auth = await verifyOwnerLoginOtp({ email: email.trim().toLowerCase(), code: otp });
      const isAdmin = auth.memberships.some(
        (m) => m.role === 'platform_admin' && m.status === 'active'
      );
      if (!isAdmin) {
        await logoutOperator().catch(() => {});
        setNotice({ err: 'Access Denied: This account is not a platform administrator.' });
        return;
      }
      onSuccess(auth);
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      const rem = 3 - next;
      const msg =
        next >= 3
          ? 'Maximum attempts (3/3) exceeded. Code invalidated. Request a new code.'
          : `Invalid code. ${rem} attempt${rem === 1 ? '' : 's'} remaining.`;
      setNotice({ err: getAuthErrorMessage(err, msg) });
    } finally {
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep('email');
    setAttempts(0);
    setOtp('');
    setNotice({});
  };

  return (
    <div style={adminLayoutStyles.authCard}>
      <div style={adminLayoutStyles.authIcon}>SP</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
        Platform Administration
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
        {step === 'email'
          ? 'Enter your administrator email to receive a secure login code.'
          : `Enter the 6-digit code sent to ${email}.`}
      </p>

      {notice.err && <div style={adminLayoutStyles.errorBanner}>{notice.err}</div>}
      {notice.info && <div style={adminTableStyles.infoBanner}>{notice.info}</div>}

      {step === 'email' ? (
        <form onSubmit={handleRequestOtp}>
          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>Admin Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kalyansmv@gmail.com"
              required
              autoFocus
              style={adminTableStyles.formControl}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ ...adminLayoutStyles.btnBlock, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Sending OTP...' : 'Send Secure Login Code'}
          </button>
        </form>
      ) : (
        <AdminLoginOtpStep
          otp={otp}
          loading={loading}
          cooldown={cooldown}
          attempts={attempts}
          onOtpChange={setOtp}
          onVerify={handleVerifyOtp}
          onResend={() => handleRequestOtp()}
          onChangeEmail={resetToEmail}
        />
      )}
    </div>
  );
}
