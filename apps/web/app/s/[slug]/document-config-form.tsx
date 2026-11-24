'use client';

import React from 'react';
import { DocumentPrintConfig, StudioPrintRatesContract } from '@snapprint/contracts';
import { DocumentOptionsGrid } from './document-options-grid';

interface DocumentConfigFormProps {
  config: DocumentPrintConfig;
  filename: string;
  pageCount: number;
  printRates?: StudioPrintRatesContract;
  onUpdate: (updated: DocumentPrintConfig) => void;
  onPreview: () => void;
  onRemove: () => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '3px',
};

const stepBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 700,
};

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
            style={{ ...actionBtnBase, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155' }}
          >
            👁️ Preview
          </button>
          <button
            type="button"
            onClick={onRemove}
            style={{ ...actionBtnBase, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <DocumentOptionsGrid
        config={config}
        pageCount={pageCount}
        printRates={printRates}
        onUpdate={onUpdate}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Pages</label>
          <input
            type="text"
            value={isSinglePage ? '1' : config.pageSelection}
            disabled={isSinglePage}
            readOnly={isSinglePage}
            onChange={(e) => onUpdate({ ...config, pageSelection: e.target.value })}
            placeholder={isSinglePage ? '1' : 'all'}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: isSinglePage ? '#f1f5f9' : '#ffffff',
              cursor: isSinglePage ? 'not-allowed' : 'text',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Copies</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onUpdate({ ...config, copies: Math.max(1, config.copies - 1) })}
              style={stepBtnStyle}
            >
              -
            </button>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                minWidth: '24px',
                textAlign: 'center',
              }}
            >
              {config.copies}
            </span>
            <button
              type="button"
              onClick={() => onUpdate({ ...config, copies: Math.min(100, config.copies + 1) })}
              style={stepBtnStyle}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
