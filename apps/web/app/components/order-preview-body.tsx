'use client';

import React from 'react';
import { OrderDocumentDeletedView } from './order-document-deleted-view';

interface OrderPreviewBodyProps {
  isCancelled: boolean;
  isDeleted: boolean;
  loading: boolean;
  error: string | null;
  blobUrl: string | null;
  mimeType: string | null;
  filename: string;
  orderNumber: string;
  onRetry: () => void;
}

const boxStyle = (bg: string, border: string): React.CSSProperties => ({
  margin: '16px 0',
  padding: '28px 16px',
  textAlign: 'center',
  backgroundColor: bg,
  border: `1px solid ${border}`,
  borderRadius: '8px',
});

export function OrderPreviewBody({
  isCancelled,
  isDeleted,
  loading,
  error,
  blobUrl,
  mimeType,
  filename,
  orderNumber,
  onRetry,
}: OrderPreviewBodyProps) {
  if (isCancelled) {
    return (
      <div role="status" style={boxStyle('#f8fafc', '#e2e8f0')}>
        <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🚫</span>
        <strong
          style={{ display: 'block', color: '#334155', marginBottom: '4px', fontSize: '15px' }}
        >
          Preview Unavailable
        </strong>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Document preview is unavailable because order {orderNumber} has been cancelled.
        </p>
      </div>
    );
  }

  if (isDeleted) return <OrderDocumentDeletedView />;

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={boxStyle('#f8fafc', '#e2e8f0')}>
        <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📄</span>
        <strong
          style={{ display: 'block', color: '#334155', fontSize: '14px', marginBottom: '4px' }}
        >
          Loading document preview...
        </strong>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Fetching authorized stream</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={boxStyle('#fef2f2', '#fecaca')}>
        <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>⚠️</span>
        <strong
          style={{ display: 'block', color: '#991b1b', fontSize: '14px', marginBottom: '4px' }}
        >
          Document Preview Unavailable
        </strong>
        <p style={{ margin: '0 auto 12px', maxWidth: '380px', fontSize: '13px', color: '#b91c1c' }}>
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            minHeight: '44px',
            padding: '6px 18px',
            backgroundColor: '#ffffff',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ↻ Retry Loading
        </button>
      </div>
    );
  }

  if (blobUrl) {
    const isImage = mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|heic)$/i.test(filename);
    return isImage ? (
      <div
        style={{
          margin: '10px 0',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '260px',
        }}
      >
        <img
          src={blobUrl}
          alt={filename}
          style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
        />
      </div>
    ) : (
      <div
        style={{
          margin: '10px 0',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={blobUrl}
          title={filename}
          style={{ width: '100%', height: '400px', border: 'none', backgroundColor: '#fff' }}
        />
      </div>
    );
  }

  return null;
}
