'use client';

import React from 'react';
import { OrderPaymentStatus, OrderRecord, OrderStatus } from '@snapprint/contracts';

interface OrderQueueItemProps {
  order: OrderRecord;
  updating: boolean;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onRecordPayment?: (order: OrderRecord) => void;
}

export function OrderQueueItem({
  order,
  updating,
  onStatusChange,
  onRecordPayment,
}: OrderQueueItemProps) {
  const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
    submitted: { bg: '#f1f5f9', text: '#475569' },
    processing: { bg: '#e0f2fe', text: '#0369a1' },
    ready: { bg: '#fef3c7', text: '#92400e' },
    completed: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
  };

  const paymentColors: Record<OrderPaymentStatus, { bg: string; text: string }> = {
    PAID: { bg: '#dcfce7', text: '#166534' },
    PARTIALLY_PAID: { bg: '#e0f2fe', text: '#0369a1' },
    UNPAID: { bg: '#fee2e2', text: '#991b1b' },
    PAYMENT_FAILED: { bg: '#fef2f2', text: '#b91c1c' },
  };

  const paymentStatus = order.paymentStatus ?? 'UNPAID';
  const statusBadge = statusColors[order.status] || statusColors.submitted;
  const paymentBadge = paymentColors[paymentStatus] || paymentColors.UNPAID;

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '10px',
        }}
      >
        <div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            {order.orderNumber}
          </span>
          {order.customerName && (
            <span
              style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
            >
              · {order.customerName} {order.customerPhone && `(${order.customerPhone})`}
            </span>
          )}
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Submitted {new Date(order.createdAt).toLocaleTimeString()} · {order.totalSheets} total
            sheets
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: paymentBadge.bg,
              color: paymentBadge.text,
            }}
          >
            {paymentStatus}
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: statusBadge.bg,
              color: statusBadge.text,
            }}
          >
            {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f8fafc',
          padding: '10px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
        }}
      >
        {order.items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              marginBottom: '4px',
            }}
          >
            <span>
              <strong>{item.filename}</strong> — {item.paperSize.toUpperCase()},{' '}
              {item.colorMode === 'color' ? 'Color' : 'B&W'},{' '}
              {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'}, {item.sheetsCount} sheets ×{' '}
              {item.copies} copies
            </span>
            <span style={{ fontWeight: 600 }}>₹{(item.subtotalMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
            Total: ₹{(order.totalAmountMinor / 100).toFixed(2)}
          </span>
          {(order.paidAmountMinor ?? 0) > 0 && paymentStatus !== 'PAID' && (
            <span
              style={{ fontSize: '12px', color: '#16a34a', marginLeft: '8px', fontWeight: 600 }}
            >
              (Paid: ₹{((order.paidAmountMinor ?? 0) / 100).toFixed(2)})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {paymentStatus !== 'PAID' && onRecordPayment && (
            <button
              type="button"
              onClick={() => onRecordPayment(order)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
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
                padding: '6px 12px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🖨️ Start Printing
            </button>
          )}

          {order.status === 'processing' && (
            <button
              type="button"
              onClick={() => onStatusChange(order.orderId, 'ready')}
              disabled={updating}
              style={{
                padding: '6px 12px',
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📦 Mark Ready
            </button>
          )}

          {order.status === 'ready' && (
            <button
              type="button"
              onClick={() => onStatusChange(order.orderId, 'completed')}
              disabled={updating}
              style={{
                padding: '6px 12px',
                backgroundColor: '#15803d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✅ Complete Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
