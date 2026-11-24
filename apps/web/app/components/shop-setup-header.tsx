'use client';

import React from 'react';

interface ShopSetupHeaderProps {
  onCancel?: () => void;
}

export function ShopSetupHeader({ onCancel }: ShopSetupHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}
    >
      <div>
        <h2
          id="wizard-title"
          style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}
        >
          Shop Onboarding & Guided Setup
        </h2>
        <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.8125rem' }}>
          Configure your shop profile, limits, and payment methods in 4 quick steps.
        </p>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close setup wizard"
          className="dialog-close-btn"
        >
          ✕
        </button>
      )}
    </div>
  );
}
