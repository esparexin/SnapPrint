'use client';

import React from 'react';

interface ShopActivatedCardProps {
  publicUrl: string;
  onGoToDashboard: () => void;
}

export function ShopActivatedCard({ publicUrl, onGoToDashboard }: ShopActivatedCardProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-success-heading"
      style={{
        background: '#ffffff',
        borderRadius: '0.75rem',
        padding: '2rem',
        border: '1px solid #bbf7d0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem', margin: '0 0 0.5rem' }}>🎉</div>
      <h2
        id="wizard-success-heading"
        style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', margin: '0 0 0.5rem' }}
      >
        Shop Successfully Activated!
      </h2>
      <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
        Your print shop is now live. Customers can scan your QR code or visit your URL to upload
        documents directly.
      </p>

      <div
        style={{
          padding: '0.75rem 1rem',
          background: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          display: 'inline-block',
          marginBottom: '1.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            display: 'block',
            marginBottom: '0.25rem',
          }}
        >
          Public Customer URL:
        </span>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontWeight: 600,
            color: '#0284c7',
            fontSize: '1rem',
            textDecoration: 'underline',
          }}
        >
          {publicUrl}
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={onGoToDashboard}
          style={{
            padding: '0.625rem 1.5rem',
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to Operator Dashboard
        </button>
      </div>
    </div>
  );
}
