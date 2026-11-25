'use client';

import React from 'react';
import { DocumentPrintConfig, StudioPrintRatesContract } from '@snapprint/contracts';
import { DocumentCopiesStepper } from './document-copies-stepper';
import { DocumentOptionsGrid } from './document-options-grid';

interface DocumentConfigFormProps {
  config: DocumentPrintConfig;
  filename: string;
  pageCount: number;
  printRates?: StudioPrintRatesContract;
  isRemoving?: boolean;
  onUpdate: (updated: DocumentPrintConfig) => void;
  onPreview: () => void;
  onRemove: () => void;
}

const actionBtnBase: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

export function DocumentConfigForm({
  config,
  filename,
  pageCount,
  printRates,
  isRemoving = false,
  onUpdate,
  onPreview,
  onRemove,
}: DocumentConfigFormProps) {
  const isSinglePage = pageCount === 1;

  return (
    <div
      style={{
        padding: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '8px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '14px',
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filename}
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '3px',
              padding: '1px 6px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            📄 {pageCount} {isSinglePage ? 'Page' : 'Pages'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Preview ${filename}`}
            style={{
              ...actionBtnBase,
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            👁️ Preview
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Delete ${filename}`}
            style={{
              ...actionBtnBase,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              opacity: isRemoving ? 0.6 : 1,
              cursor: isRemoving ? 'not-allowed' : 'pointer',
            }}
          >
            {isRemoving ? 'Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      <DocumentOptionsGrid
        config={config}
        pageCount={pageCount}
        printRates={printRates}
        onUpdate={onUpdate}
      />

      <DocumentCopiesStepper config={config} isSinglePage={isSinglePage} onUpdate={onUpdate} />
    </div>
  );
}
