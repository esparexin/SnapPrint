'use client';

import React from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';

interface DocumentPreviewHeaderProps {
  filename: string;
  config: DocumentPrintConfig;
  pageCount: number;
  onClose: () => void;
}

export function DocumentPreviewHeader({
  filename,
  config,
  pageCount,
  onClose,
}: DocumentPreviewHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <h3
          id="document-preview-title"
          style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}
        >
          Document Preview: {filename}
        </h3>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {`${config.paperSize.toUpperCase()} · ${config.colorMode === 'color' ? 'Color' : 'B&W'} · ${config.sides === 'double_sided' ? 'Duplex' : 'Single-Sided'} · ${pageCount} Pages`}
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
        ✕
      </button>
    </div>
  );
}
