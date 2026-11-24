'use client';

import React from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';

interface DocumentCopiesStepperProps {
  config: DocumentPrintConfig;
  isSinglePage: boolean;
  onUpdate: (updated: DocumentPrintConfig) => void;
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

export function DocumentCopiesStepper({
  config,
  isSinglePage,
  onUpdate,
}: DocumentCopiesStepperProps) {
  return (
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
  );
}
