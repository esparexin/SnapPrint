'use client';

import React from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { getOperatorDocumentDownloadUrl } from '../../src/order-client';
import { useDialog } from '../hooks/use-dialog';
import { OrderDocumentDeletedView } from './order-document-deleted-view';
import { OrderPreviewActions } from './order-preview-actions';

interface OrderDocumentPreviewModalProps {
  studioId: string;
  order: OrderRecord;
  item: QuoteItemBreakdown;
  onClose: () => void;
  onDeleteDocument: (orderId: string, assetId: string) => Promise<void>;
}

export function OrderDocumentPreviewModal({
  studioId,
  order,
  item,
  onClose,
  onDeleteDocument,
}: OrderDocumentPreviewModalProps) {
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const downloadUrl = getOperatorDocumentDownloadUrl(studioId, order.orderId, item.assetId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="dialog-overlay max-md:items-end"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content pb-safe max-md:rounded-b-none"
        style={{ maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column' }}
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
              {item.filename} ({item.paperSize.toUpperCase()} ·{' '}
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

        {isCancelled ? (
          <div
            role="status"
            style={{
              margin: '20px 0',
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
            }}
          >
            <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🚫</span>
            <strong style={{ display: 'block', color: '#334155', marginBottom: '4px', fontSize: '15px' }}>
              Preview Unavailable
            </strong>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Document preview is unavailable because order {order.orderNumber} has been cancelled.
            </p>
          </div>
        ) : item.isDeleted ? (
          <OrderDocumentDeletedView />
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
              src={downloadUrl}
              title={item.filename}
              style={{ width: '100%', height: '360px', border: 'none', backgroundColor: '#fff' }}
            />
          </div>
        )}

        <OrderPreviewActions
          isCompleted={isCompleted}
          isDeleted={Boolean(item.isDeleted)}
          isCancelled={isCancelled}
          filename={item.filename}
          orderId={order.orderId}
          assetId={item.assetId}
          downloadUrl={downloadUrl}
          onClose={onClose}
          onDeleteDocument={onDeleteDocument}
        />
      </div>
    </div>
  );
}
