'use client';

import React, { useState } from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';
import { useDialog } from '../../hooks/use-dialog';

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
  const [loadingPreview, setLoadingPreview] = useState(true);
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="dialog-overlay"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '720px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
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
            position: 'relative',
          }}
        >
          {loadingPreview && (
            <div
              role="status"
              aria-live="polite"
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '24px' }}>📄</span>
              <span>Loading document preview...</span>
            </div>
          )}
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={filename}
              onLoad={() => setLoadingPreview(false)}
              style={{
                width: '100%',
                height: '500px',
                maxHeight: 'min(500px, 60vh)',
                border: 'none',
              }}
            />
          ) : (
            <img
              src={previewUrl}
              alt={filename}
              onLoad={() => setLoadingPreview(false)}
              onError={() => setLoadingPreview(false)}
              style={{
                maxWidth: '100%',
                maxHeight: 'min(500px, 60vh)',
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
