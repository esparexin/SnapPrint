'use client';

import React from 'react';

interface PrinterFleetFooterProps {
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export function PrinterFleetFooter({ loading, onRefresh, onClose }: PrinterFleetFooterProps) {
  return (
    <div
      style={{
        padding: '12px 24px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
      }}
    >
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        style={{
          padding: '6px 12px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          color: '#334155',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        ↻ Refresh Printers
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '6px 16px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
}
