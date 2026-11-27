'use client';

import React, { useState } from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { resolveFormatLabel } from '../s/[slug]/format-size-label';
import {
  deletedBadgeStyle,
  getPreviewStyle,
  nameWrapStyle,
  purgeBtnStyle,
  resolveDocumentPreviewStatus,
  rowStyle,
} from './order-document-preview-label';
import { OrderDocumentPurgeModal } from './order-document-purge-modal';

interface OrderQueueDocumentRowProps {
  order: OrderRecord;
  item: QuoteItemBreakdown;
  isUnavailable?: boolean;
  onPreview: (order: OrderRecord, item: QuoteItemBreakdown) => void;
  onDeleteDocument?: (orderId: string, assetId: string) => Promise<void>;
}

export function OrderQueueDocumentRow({
  order,
  item,
  isUnavailable = false,
  onPreview,
  onDeleteDocument,
}: OrderQueueDocumentRowProps) {
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const isDeleted = Boolean(item.isDeleted);
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';
  const isPreviewAvailable = !isDeleted && !isCancelled && !isUnavailable;

  const { title: previewBtnTitle, label: previewBtnText } = resolveDocumentPreviewStatus(
    isUnavailable,
    isCancelled,
    isDeleted,
    item.filename
  );

  const handlePurge = async () => {
    setPurging(true);
    try {
      await onDeleteDocument?.(order.orderId, item.assetId);
      setShowPurgeModal(false);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div style={rowStyle}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
        <span style={nameWrapStyle} title={item.filename}>
          <strong>{item.filename}</strong>
        </span>
        <span style={{ color: '#475569' }}>
          — {resolveFormatLabel(item.paperSize)}, {item.colorMode === 'color' ? 'Color' : 'B&W'},{' '}
          {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'}, {item.sheetsCount} sh ×{' '}
          {item.copies}
        </span>
        {isDeleted && <span style={deletedBadgeStyle}>🔒 DELETED</span>}
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 600 }}>₹{(item.subtotalMinor / 100).toFixed(2)}</span>
        <button
          type="button"
          onClick={() => isPreviewAvailable && onPreview(order, item)}
          disabled={!isPreviewAvailable}
          title={previewBtnTitle}
          style={getPreviewStyle(isPreviewAvailable)}
        >
          {previewBtnText}
        </button>
        {isCompleted && !isDeleted && onDeleteDocument && (
          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            style={purgeBtnStyle}
            title="Purge document binary from storage"
          >
            🗑️ Purge
          </button>
        )}
      </span>

      {showPurgeModal && (
        <OrderDocumentPurgeModal
          filename={item.filename}
          purging={purging}
          onConfirm={handlePurge}
          onClose={() => !purging && setShowPurgeModal(false)}
        />
      )}
    </div>
  );
}
