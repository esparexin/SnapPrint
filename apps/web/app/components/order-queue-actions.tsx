'use client';

import React from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';

interface OrderQueueActionsProps {
  order: OrderRecord;
  updating: boolean;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onRecordPayment?: (order: OrderRecord) => void;
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
}: OrderQueueActionsProps) {
  const paymentStatus = order.paymentStatus ?? 'UNPAID';

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {paymentStatus !== 'PAID' && onRecordPayment && (
        <button
          type="button"
          onClick={() => onRecordPayment(order)}
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
          style={{ ...actionBtn, backgroundColor: '#0284c7' }}
        >
          🖨️ Start Printing
        </button>
      )}

      {order.status === 'processing' && (
        <button
          type="button"
          onClick={() => onStatusChange(order.orderId, 'ready')}
          disabled={updating}
          style={{ ...actionBtn, backgroundColor: '#d97706' }}
        >
          📦 Mark Ready
        </button>
      )}

      {order.status === 'ready' && (
        <button
          type="button"
          onClick={() => onStatusChange(order.orderId, 'completed')}
          disabled={updating}
          style={{ ...actionBtn, backgroundColor: '#15803d' }}
        >
          ✅ Complete Order
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
          }}
        >
          ✕ Cancel
        </button>
      )}
    </div>
  );
}
