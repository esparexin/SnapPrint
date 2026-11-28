'use client';

import React from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { resolveFormatLabel } from '../s/[slug]/format-size-label';
import { getOperatorDocumentDownloadUrl } from '../../src/order-client';
import { useDialog } from '../hooks/use-dialog';
import { useOrderDocumentPreview } from '../hooks/use-order-document-preview';
import { OrderPreviewActions } from './order-preview-actions';
import { OrderPreviewBody } from './order-preview-body';

interface OrderDocumentPreviewModalProps {
  studioId: string;
  order: OrderRecord;
  item: QuoteItemBreakdown;
  onClose: () => void;
  onDeleteDocument: (orderId: string, assetId: string) => Promise<void>;
  onUnavailable?: (assetId: string) => void;
}

export function OrderDocumentPreviewModal({
  studioId,
  order,
  item,
  onClose,
  onDeleteDocument,
  onUnavailable,
}: OrderDocumentPreviewModalProps) {
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const isDeleted = Boolean(item.isDeleted);
  const downloadUrl = getOperatorDocumentDownloadUrl(studioId, order.orderId, item.assetId);

  const { blobUrl, mimeType, loading, error, loadPreview } = useOrderDocumentPreview(
    studioId,
    order.orderId,
    item.assetId,
    isCancelled || isDeleted,
    onUnavailable
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="dialog-overlay dialog-overlay-nested"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content pb-safe"
        style={{
          maxWidth: '680px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px',
          }}
        >
          <div>
            <h2
              id="preview-modal-title"
              style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}
            >
              Preview · Order {order.orderNumber}
            </h2>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
              {item.filename} ({resolveFormatLabel(item.paperSize)} ·{' '}
              {item.colorMode === 'color' ? 'Color' : 'B&W'} ·{' '}
              {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <OrderPreviewBody
          isCancelled={isCancelled}
          isDeleted={isDeleted}
          loading={loading}
          error={error}
          blobUrl={blobUrl}
          mimeType={mimeType}
          filename={item.filename}
          orderNumber={order.orderNumber}
          onRetry={loadPreview}
        />

        <OrderPreviewActions
          isCompleted={isCompleted}
          isDeleted={isDeleted}
          isCancelled={isCancelled}
          filename={item.filename}
          orderId={order.orderId}
          assetId={item.assetId}
          downloadUrl={downloadUrl}
          blobUrl={blobUrl}
          hasError={Boolean(error)}
          isLoading={loading}
          onClose={onClose}
          onDeleteDocument={onDeleteDocument}
        />
      </div>
    </div>
  );
}
