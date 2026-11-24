'use client';

import React from 'react';

interface AgentPairingCodeCardProps {
  code: string;
  copied: boolean;
  onCopy: () => void;
}

export function AgentPairingCodeCard({ code, copied, onCopy }: AgentPairingCodeCardProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#64748b',
            }}
          >
            15-Minute One-Time Pairing Code
          </span>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#0284c7',
              padding: '8px 0',
            }}
          >
            {code}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Expires in 15 minutes (Single redemption)
          </span>
        </div>

        <button
          type="button"
          onClick={onCopy}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: copied ? '#16a34a' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied Code!' : 'Copy Code'}
        </button>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          color: '#334155',
          lineHeight: 1.5,
        }}
      >
        <strong>Setup Steps on Shop Computer:</strong>
        <ol style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
          <li>Open the SnapPrint Agent on your Windows/Mac shop computer.</li>
          <li>
            Run command: <code>pnpm agent:pair</code> or launch the tray app.
          </li>
          <li>Paste this pairing code when prompted to link your printers.</li>
        </ol>
      </div>
    </>
  );
}
