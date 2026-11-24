'use client';

import React from 'react';

interface PrinterFleetHeaderProps {
  studioId: string;
  studioName?: string;
  onOpenPairing: () => void;
  onClose: () => void;
}

export function PrinterFleetHeader({
  studioId,
  studioName,
  onOpenPairing,
  onClose,
}: PrinterFleetHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <h2
          id="printer-management-title"
          style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
        >
          Hardware &amp; Printers Fleet
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
          {studioName || `Studio ${studioId}`} · Capability Routing &amp; Discovery
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={onOpenPairing}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Pair PC Agent
        </button>
        <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
          ✕
        </button>
      </div>
    </div>
  );
}
