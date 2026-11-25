'use client';

import React from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';

interface OrderQueueActionsProps {
  order: OrderRecord;
  updating: boolean;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onRecordPayment?: (order: OrderRecord) => void;
  onRequestHandover?: (order: OrderRecord) => void;
}

const actionBtn = {
  minHeight: '44px',
  padding: '8px 14px',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
} as const;

export function OrderQueueActions({
  order,
  updating,
  onStatusChange,
  onRecordPayment,
  onRequestHandover,
}: OrderQueueActionsProps) {
  const paymentStatus = order.paymentStatus ?? 'UNPAID';

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {paymentStatus !== 'PAID' && onRecordPayment && (
        <button
          type="button"
          onClick={() => onRecordPayment(order)}
          disabled={updating}
          style={{ ...actionBtn, backgroundColor: '#16a34a' }}
        >
          💰 Record Payment
        </button>
      )}

      {order.status === 'submitted' && (
        <button
          type="button"
          onClick={() => onStatusChange(order.orderId, 'processing')}
          disabled={updating}
          style={{
            ...actionBtn,
            backgroundColor: updating ? '#0369a1' : '#0284c7',
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.75 : 1,
          }}
        >
          {updating ? '⏳ Dispatching...' : '🖨️ Start Printing'}
        </button>
      )}

      {order.status === 'processing' && (
        <button
          type="button"
          onClick={() => onStatusChange(order.orderId, 'ready')}
          disabled={updating}
          style={{
            ...actionBtn,
            backgroundColor: updating ? '#b45309' : '#d97706',
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.75 : 1,
          }}
        >
          {updating ? '⏳ Updating...' : '📦 Mark Ready'}
        </button>
      )}

      {order.status === 'ready' && (
        <button
          type="button"
          onClick={() =>
            onRequestHandover
              ? onRequestHandover(order)
              : onStatusChange(order.orderId, 'completed')
          }
          disabled={updating}
          style={{
            ...actionBtn,
            backgroundColor: updating ? '#166534' : '#15803d',
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.75 : 1,
          }}
        >
          {updating ? '⏳ Completing...' : '✅ Complete Order'}
        </button>
      )}

      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
              onStatusChange(order.orderId, 'cancelled');
            }
          }}
          disabled={updating}
          style={{
            ...actionBtn,
            backgroundColor: '#fff',
            color: '#b91c1c',
            border: '1px solid #f87171',
            fontSize: '12px',
            padding: '8px 12px',
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.6 : 1,
          }}
        >
          ✕ Cancel
        </button>
      )}
    </div>
  );
}
