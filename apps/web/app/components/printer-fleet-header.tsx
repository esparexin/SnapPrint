'use client';

import React from 'react';
import { getAgentDownloadUrl } from '../../src/printer-client';

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
  const downloadUrl = getAgentDownloadUrl();

  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={downloadUrl}
          download="SnapPrint-Print-Agent.msi"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            minHeight: '44px',
            backgroundColor: '#f1f5f9',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          📥 Download Agent (.msi)
        </a>
        <button
          type="button"
          onClick={onOpenPairing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            minHeight: '44px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxSizing: 'border-box',
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
