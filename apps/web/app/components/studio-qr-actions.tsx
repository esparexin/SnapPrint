'use client';

import React from 'react';

interface StudioQrActionsProps {
  copied: boolean;
  hasSvg: boolean;
  hasPng: boolean;
  onCopy: () => void;
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  onPrint: () => void;
}

export function StudioQrActions({
  copied,
  hasSvg,
  hasPng,
  onCopy,
  onDownloadSvg,
  onDownloadPng,
  onPrint,
}: StudioQrActionsProps) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={onCopy}
          style={{
            padding: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#334155',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Studio URL'}
        </button>
        <button
          onClick={onDownloadPng}
          disabled={!hasPng}
          style={{
            padding: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#334155',
          }}
        >
          Download PNG (1024px)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          onClick={onDownloadSvg}
          disabled={!hasSvg}
          style={{
            padding: '10px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Download Vector SVG
        </button>
        <button
          onClick={onPrint}
          style={{
            padding: '10px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Print Stand Card
        </button>
      </div>
    </>
  );
}
