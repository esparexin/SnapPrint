'use client';

import React from 'react';

interface EmptyPrinterStateProps {
  onPairAgent: () => void;
  isBound?: boolean;
}

export function EmptyPrinterState({ onPairAgent, isBound = false }: EmptyPrinterStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '36px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🖨️</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#0f172a' }}>
        No Printers Registered
      </h3>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '0.875rem',
          color: '#64748b',
          maxWidth: '420px',
          marginInline: 'auto',
          lineHeight: 1.5,
        }}
      >
        Install the SnapPrint Desktop Agent on your shop computer and pair it using a pairing key to
        discover your local drivers.
      </p>

      <div
        role="status"
        style={{
          margin: '0 auto 20px',
          maxWidth: '440px',
          padding: '10px 14px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          textAlign: 'left',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
          ℹ️
        </span>
        <div>
          <strong style={{ display: 'block', color: '#1e3a8a', marginBottom: '2px' }}>
            Page Setup &amp; Rates Unavailable
          </strong>
          <span>
            Paper sizes (A4, A3, Legal, etc.), duplex options, and print rate configurations will
            automatically unlock once your first printer is registered.
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onPairAgent}
        style={{
          padding: '8px 16px',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        {isBound ? 'View Paired PC' : 'Generate Pairing Key'}
      </button>
    </div>
  );
}
