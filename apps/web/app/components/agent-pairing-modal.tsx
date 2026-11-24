'use client';

import React, { useEffect, useState } from 'react';
import { AgentPairingKeyResponse, generateAgentPairingKey } from '../../src/printer-client';
import { useDialog } from '../hooks/use-dialog';

interface AgentPairingModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
}

export function AgentPairingModal({ studioId, studioName, onClose }: AgentPairingModalProps) {
  const [keyData, setKeyData] = useState<AgentPairingKeyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const requestPairingKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateAgentPairingKey(studioId);
      setKeyData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pairing key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestPairingKey();
  }, [studioId]);

  const handleCopy = async () => {
    if (!keyData?.code) return;
    try {
      await navigator.clipboard.writeText(keyData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-pairing-title"
      className="dialog-overlay dialog-overlay-nested"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '480px',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            id="agent-pairing-title"
            style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
          >
            Pair Shop PC Print Agent
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dialog-close-btn"
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '8px 0 16px', fontSize: '0.875rem', color: '#475569' }}>
          Connect the desktop background agent on {studioName || 'your shop computer'} to
          automatically discover and route print jobs to your local printers.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            Generating secure pairing key...
          </div>
        ) : keyData ? (
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
                {keyData.code}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Expires in 15 minutes (Single redemption)
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
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
        ) : null}

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

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={requestPairingKey}
            disabled={loading}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
