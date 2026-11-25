'use client';

import React from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';

interface OrderQueueDocumentRowProps {
  order: OrderRecord;
  item: QuoteItemBreakdown;
  onPreview: (order: OrderRecord, item: QuoteItemBreakdown) => void;
  onDeleteDocument?: (orderId: string, assetId: string) => Promise<void>;
}

export function OrderQueueDocumentRow({
  order,
  item,
  onPreview,
  onDeleteDocument,
}: OrderQueueDocumentRowProps) {
  const isDeleted = Boolean(item.isDeleted);
  const isCompleted = order.status === 'completed';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        marginBottom: '6px',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '4px 0',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
        <span
          style={{
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
          title={item.filename}
        >
          <strong>{item.filename}</strong>
        </span>
        <span style={{ color: '#475569' }}>
          — {item.paperSize.toUpperCase()}, {item.colorMode === 'color' ? 'Color' : 'B&W'},{' '}
          {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'}, {item.sheetsCount} sh ×{' '}
          {item.copies}
        </span>
        {isDeleted && (
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            🔒 DELETED
          </span>
        )}
      </span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 600 }}>₹{(item.subtotalMinor / 100).toFixed(2)}</span>
        <button
          type="button"
          onClick={() => onPreview(order, item)}
          style={{
            minHeight: '36px',
            padding: '4px 10px',
            backgroundColor: isDeleted ? '#f8fafc' : '#f0f9ff',
            border: `1px solid ${isDeleted ? '#cbd5e1' : '#bae6fd'}`,
            borderRadius: '4px',
            fontSize: '11px',
            color: isDeleted ? '#64748b' : '#0284c7',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {isDeleted ? '🔒 Details' : '📄 Preview'}
        </button>
        {isCompleted && !isDeleted && onDeleteDocument && (
          <button
            type="button"
            onClick={async () => {
              if (
                window.confirm(`Permanently delete "${item.filename}" to protect customer privacy?`)
              ) {
                await onDeleteDocument(order.orderId, item.assetId);
              }
            }}
            style={{
              minHeight: '36px',
              padding: '4px 8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#991b1b',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Purge document binary from storage"
          >
            🗑️ Purge
          </button>
        )}
      </span>
    </div>
  );
}
