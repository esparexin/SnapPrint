'use client';

import React from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';
import { DocumentOptionsGrid } from './document-options-grid';

interface DocumentConfigFormProps {
  config: DocumentPrintConfig;
  filename: string;
  pageCount: number;
  onUpdate: (updated: DocumentPrintConfig) => void;
  onPreview: () => void;
  onRemove: () => void;
}

export function DocumentConfigForm({
  config,
  filename,
  pageCount,
  onUpdate,
  onPreview,
  onRemove,
}: DocumentConfigFormProps) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '14px',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{filename}</div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 8px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            📄 {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onPreview}
            style={{
              padding: '4px 10px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            👁️ Preview
          </button>
          <button
            type="button"
            onClick={onRemove}
            style={{
              padding: '4px 10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#b91c1c',
              cursor: 'pointer',
            }}
          >
            ✕ Remove
          </button>
        </div>
      </div>

      <DocumentOptionsGrid config={config} onUpdate={onUpdate} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        {/* Page Range Selection */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Pages (e.g. all, 1-5, 8)
          </label>
          <input
            type="text"
            value={config.pageSelection}
            onChange={(e) => onUpdate({ ...config, pageSelection: e.target.value })}
            placeholder="all"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Copies Counter */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Copies
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onUpdate({ ...config, copies: Math.max(1, config.copies - 1) })}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                fontWeight: 700,
              }}
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
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
