'use client';

import React, { useEffect, useState } from 'react';
import { AgentPairingKeyResponse, generateAgentPairingKey } from '../../src/printer-client';
import { AgentPairingCodeCard } from './agent-pairing-code-card';
import { AgentPairingModalFooter } from './agent-pairing-modal-footer';
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
      /* Fallback */
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
        style={{ maxWidth: '480px', padding: '24px' }}
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
          <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
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
          <AgentPairingCodeCard code={keyData.code} copied={copied} onCopy={handleCopy} />
        ) : null}

        <AgentPairingModalFooter
          loading={loading}
          onRequestPairingKey={requestPairingKey}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
