'use client';

import React from 'react';
import { DocumentPrintConfig, StudioPrintRatesContract } from '@snapprint/contracts';
import { DocumentCopiesStepper } from './document-copies-stepper';
import { DocumentOptionsGrid } from './document-options-grid';
import { EyeIcon, TrashIcon } from './storefront-icons';

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
    <div className="sf-doc-card">
      <div className="sf-doc-header">
        <div
          style={{
            minWidth: 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {filename}
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '1px 6px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {pageCount} {isSinglePage ? 'Page' : 'Pages'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Preview ${filename}`}
            className="sf-doc-action-btn"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            <EyeIcon size={12} />
            Preview
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Delete ${filename}`}
            className="sf-doc-action-btn"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              opacity: isRemoving ? 0.6 : 1,
              cursor: isRemoving ? 'not-allowed' : 'pointer',
            }}
          >
            <TrashIcon size={12} />
            {isRemoving ? 'Deleting...' : 'Delete'}
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
