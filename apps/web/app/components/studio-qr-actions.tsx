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
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={onCopy}
          style={{
            minHeight: '42px',
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
          type="button"
          onClick={onDownloadPng}
          disabled={!hasPng}
          style={{
            minHeight: '42px',
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={onDownloadSvg}
          disabled={!hasSvg}
          style={{
            minHeight: '42px',
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
          type="button"
          onClick={onPrint}
          style={{
            minHeight: '42px',
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
