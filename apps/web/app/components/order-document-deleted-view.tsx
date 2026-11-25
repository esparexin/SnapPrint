'use client';

import React from 'react';

export function OrderDocumentDeletedView() {
  return (
    <div
      style={{
        padding: '36px 16px',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        margin: '12px 0',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
        Preview unavailable — document deleted
      </div>
      <p
        style={{
          fontSize: '13px',
          color: '#64748b',
          maxWidth: '380px',
          margin: '0 auto',
          lineHeight: 1.4,
        }}
      >
        This document was purged following confirmed customer handover to protect customer privacy.
      </p>
    </div>
  );
}
