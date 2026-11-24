'use client';

import React from 'react';
import { getAgentDownloadUrl } from '../../src/printer-client';

interface AgentPairingCodeCardProps {
  code: string;
  copied: boolean;
  onCopy: () => void;
}

export function AgentPairingCodeCard({ code, copied, onCopy }: AgentPairingCodeCardProps) {
  const downloadUrl = getAgentDownloadUrl();

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
            minHeight: '44px',
            padding: '10px 12px',
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

      <a
        href={downloadUrl}
        download="SnapPrint-Print-Agent.msi"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          minHeight: '44px',
          padding: '10px 16px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          boxSizing: 'border-box',
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        <span>📥</span>
        <span>Download Windows Print Agent (.msi)</span>
      </a>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          color: '#334155',
          lineHeight: 1.5,
        }}
      >
        <strong>Simple 3-Step Setup on Shop Computer:</strong>
        <ol
          style={{
            margin: '6px 0 0',
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <li>Click the button above to download and install SnapPrint-Print-Agent.msi.</li>
          <li>Launch the agent from your desktop and enter this 15-minute Pairing Code.</li>
          <li>The agent runs in the background and connects your local printers automatically.</li>
        </ol>
      </div>
    </>
  );
}
