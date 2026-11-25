'use client';

import React from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { getOperatorDocumentDownloadUrl } from '../../src/order-client';
import { useDialog } from '../hooks/use-dialog';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h2 id="preview-modal-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Preview · Order {order.orderNumber}
            </h2>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
              {item.filename} ({item.paperSize.toUpperCase()} · {item.colorMode === 'color' ? 'Color' : 'B&W'} · {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'})
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ minHeight: '44px', minWidth: '44px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>
            ✕
          </button>
        </div>

        {item.isDeleted ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '12px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Preview unavailable — document deleted
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', margin: '0 auto', lineHeight: 1.4 }}>
              This document was purged following confirmed customer handover to protect customer privacy.
            </p>
          </div>
        ) : (
          <div style={{ margin: '10px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe src={downloadUrl} title={item.filename} style={{ width: '100%', height: '360px', border: 'none', backgroundColor: '#fff' }} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          <div>
            {isCompleted && !item.isDeleted && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Permanently delete "${item.filename}" to protect customer privacy?`)) {
                    await onDeleteDocument(order.orderId, item.assetId);
                  }
                }}
                style={{ minHeight: '44px', padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                🗑️ Purge Document
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!item.isDeleted && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ minHeight: '44px', padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                ⬇️ Open Full Page
              </a>
            )}
            <button type="button" onClick={onClose} style={{ minHeight: '44px', padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
