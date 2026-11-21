'use client';

import React from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';

interface DocumentPreviewModalProps {
  slug: string;
  sessionId: string;
  token: string;
  filename: string;
  pageCount: number;
  config: DocumentPrintConfig;
  onClose: () => void;
}

export function DocumentPreviewModal({
  slug,
  sessionId,
  filename,
  pageCount,
  config,
  onClose,
}: DocumentPreviewModalProps) {
  const previewUrl = `/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/assets/${encodeURIComponent(config.assetId)}/preview`;
  const isPdf = filename.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Document Preview: {filename}
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {config.paperSize.toUpperCase()} · {config.colorMode === 'color' ? 'Color' : 'B&W'} ·{' '}
              {config.sides === 'double_sided' ? 'Duplex' : 'Single-Sided'} · {pageCount} Total
              Pages
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: '360px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={filename}
              style={{
                width: '100%',
                height: '500px',
                border: 'none',
              }}
            />
          ) : (
            <img
              src={previewUrl}
              alt={filename}
              style={{
                maxWidth: '100%',
                maxHeight: '500px',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

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
      </div>
    </div>
  );
}
