'use client';

import React from 'react';

interface AgentPairingModalFooterProps {
  loading: boolean;
  onRequestPairingKey: () => void;
  onClose: () => void;
}

export function AgentPairingModalFooter({
  loading,
  onRequestPairingKey,
  onClose,
}: AgentPairingModalFooterProps) {
  return (
    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
      <button
        type="button"
        onClick={onRequestPairingKey}
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
  );
}
