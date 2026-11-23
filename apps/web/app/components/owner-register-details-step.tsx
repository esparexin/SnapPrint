'use client';

import React from 'react';

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
          Mobile Number (prefix +91)
        </label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #d1d5db',
              borderRight: 'none',
              borderTopLeftRadius: '0.375rem',
              borderBottomLeftRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              userSelect: 'none',
            }}
          >
            +91
          </span>
          <input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            required
            disabled={isSubmitting}
            placeholder="9876543210"
            style={{
              flex: 1,
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderTopRightRadius: '0.375rem',
              borderBottomRightRadius: '0.375rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
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
          I agree to the Terms of Service
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
          I agree to the Privacy Policy
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
