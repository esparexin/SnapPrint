'use client';

import React from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';

interface DocumentPreviewFooterProps {
  config: DocumentPrintConfig;
  onClose: () => void;
}

export function DocumentPreviewFooter({ config, onClose }: DocumentPreviewFooterProps) {
  return (
    <div
      style={{
        padding: '12px 20px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#64748b',
      }}
    >
      <span>
        Selected Pages: {config.pageSelection} · Copies: {config.copies}
      </span>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '6px 14px',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Close Preview
      </button>
    </div>
  );
}
