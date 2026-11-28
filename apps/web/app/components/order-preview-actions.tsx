'use client';

import React, { useState } from 'react';
import { OrderDocumentPurgeModal } from './order-document-purge-modal';

interface OrderPreviewActionsProps {
  isCompleted: boolean;
  isDeleted: boolean;
  isCancelled?: boolean;
  filename: string;
  orderId: string;
  assetId: string;
  downloadUrl?: string;
  blobUrl?: string | null;
  hasError?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onDeleteDocument: (orderId: string, assetId: string) => Promise<void>;
}

export function OrderPreviewActions({
  isCompleted,
  isDeleted,
  isCancelled = false,
  filename,
  orderId,
  assetId,
  downloadUrl,
  blobUrl,
  hasError = false,
  isLoading = false,
  onClose,
  onDeleteDocument,
}: OrderPreviewActionsProps) {
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const isActionDisabled = isDeleted || isCancelled || hasError || isLoading;
  const activeUrl = blobUrl || downloadUrl;

  const handlePurge = async () => {
    setPurging(true);
    try {
      await onDeleteDocument(orderId, assetId);
      setShowPurgeModal(false);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '10px',
      }}
    >
      <div>
        {isCompleted && !isDeleted && (
          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            style={{
              minHeight: '44px',
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑️ Purge Document
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {!isActionDisabled && activeUrl && (
          <a
            href={activeUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              minHeight: '44px',
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            ⬇️ Download File
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            minHeight: '44px',
            padding: '10px 16px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {showPurgeModal && (
        <OrderDocumentPurgeModal
          filename={filename}
          purging={purging}
          onConfirm={handlePurge}
          onClose={() => !purging && setShowPurgeModal(false)}
        />
      )}
    </div>
  );
}
