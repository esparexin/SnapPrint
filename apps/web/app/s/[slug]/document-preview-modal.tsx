'use client';

import React, { useState } from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';
import { getPhotoPreviewUrl } from '../../../src/upload-client';
import { useDialog } from '../../hooks/use-dialog';
import { DocumentPreviewFooter } from './document-preview-footer';
import { DocumentPreviewHeader } from './document-preview-header';

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
  token,
  filename,
  pageCount,
  config,
  onClose,
}: DocumentPreviewModalProps) {
  const previewUrl = getPhotoPreviewUrl(slug, sessionId, config.assetId, token);
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
      aria-labelledby="document-preview-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '720px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <DocumentPreviewHeader
          filename={filename}
          config={config}
          pageCount={pageCount}
          onClose={onClose}
        />

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
        <DocumentPreviewFooter config={config} onClose={onClose} />
      </div>
    </div>
  );
}
