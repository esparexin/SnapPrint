'use client';

import React from 'react';

interface OwnerLoginEmailStepProps {
  email: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function OwnerLoginEmailStep({
  email,
  isSubmitting,
  onEmailChange,
  onSubmit,
}: OwnerLoginEmailStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
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
          onChange={(e) => onEmailChange(e.target.value)}
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
  );
}
