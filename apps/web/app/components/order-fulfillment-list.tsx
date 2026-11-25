'use client';

import React from 'react';
import { OrderRecord, OrderStatus, QuoteItemBreakdown } from '@snapprint/contracts';
import { OrderQueueEmptyState } from './order-queue-empty-state';
import { OrderQueueItem } from './order-queue-item';

interface OrderFulfillmentListProps {
  orders: OrderRecord[];
  loading: boolean;
  error: string | null;
  successMessage?: string | null;
  updatingId: string | null;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCollectPayment?: (order: OrderRecord) => void;
  onRecordPayment?: (order: OrderRecord) => void;
  onRequestHandover: (order: OrderRecord) => void;
  onPreviewItem: (order: OrderRecord, item: QuoteItemBreakdown) => void;
  onDeleteDocument: (orderId: string, assetId: string) => Promise<void>;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
}

const dismissBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '14px',
  minHeight: '44px',
  minWidth: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bannerBase: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '13px',
  fontWeight: 500,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export function OrderFulfillmentList({
  orders,
  loading,
  error,
  successMessage,
  updatingId,
  onStatusChange,
  onCollectPayment,
  onRecordPayment,
  onRequestHandover,
  onPreviewItem,
  onDeleteDocument,
  onDismissError,
  onDismissSuccess,
}: OrderFulfillmentListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
      {error && (
        <div
          role="alert"
          style={{
            ...bannerBase,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
          }}
        >
          <span>{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error"
              style={{ ...dismissBtn, color: '#b91c1c' }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            ...bannerBase,
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
          }}
        >
          <span>{successMessage}</span>
          {onDismissSuccess && (
            <button
              type="button"
              onClick={onDismissSuccess}
              aria-label="Dismiss message"
              style={{ ...dismissBtn, color: '#15803d' }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
          Loading incoming jobs...
        </div>
      ) : orders.length === 0 ? (
        <OrderQueueEmptyState />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {orders.map((order) => (
            <OrderQueueItem
              key={order.orderId}
              order={order}
              updating={updatingId === order.orderId}
              onStatusChange={onStatusChange}
              onCollectPayment={onCollectPayment}
              onRecordPayment={onRecordPayment}
              onRequestHandover={onRequestHandover}
              onPreviewItem={onPreviewItem}
              onDeleteDocument={onDeleteDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}
