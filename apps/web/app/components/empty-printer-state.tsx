'use client';

import React from 'react';

interface EmptyPrinterStateProps {
  onPairAgent: () => void;
}

export function EmptyPrinterState({ onPairAgent }: EmptyPrinterStateProps) {
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
          maxWidth: '380px',
          marginInline: 'auto',
        }}
      >
        Install the SnapPrint Desktop Agent on your shop computer and pair it using a pairing key to
        discover your local drivers.
      </p>
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
        Generate Pairing Key
      </button>
    </div>
  );
}
