'use client';

import React from 'react';
import { CURRENT_PRIVACY_POLICY_VERSION, CURRENT_TERMS_VERSION } from '@snapprint/contracts';

interface OwnerRegisterDetailsStepProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  privacyAccepted: boolean;
  setPrivacyAccepted: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function OwnerRegisterDetailsStep({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  termsAccepted,
  setTermsAccepted,
  privacyAccepted,
  setPrivacyAccepted,
  isSubmitting,
  onSubmit,
}: OwnerRegisterDetailsStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={{ marginBottom: '0.875rem' }}>
        <label
          htmlFor="reg-name"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          Your Full Name
        </label>
        <input
          id="reg-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
          placeholder="e.g. Rajesh Kumar"
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '0.875rem' }}>
        <label
          htmlFor="reg-email"
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
          id="reg-email"
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
      <div style={{ marginBottom: '0.875rem' }}>
        <label
          htmlFor="reg-phone"
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          Mobile Number (with country code)
        </label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={isSubmitting}
          placeholder="+919876543210"
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.8125rem',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginRight: '0.5rem' }}
          />
          I agree to the Terms of Service (v{CURRENT_TERMS_VERSION})
        </label>
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.8125rem',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => setPrivacyAccepted(e.target.checked)}
            style={{ marginRight: '0.5rem' }}
          />
          I agree to the Privacy Policy (v{CURRENT_PRIVACY_POLICY_VERSION})
        </label>
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
        {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
      </button>
    </form>
  );
}
