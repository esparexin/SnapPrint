'use client';

import React from 'react';
import { OrderPaymentStatus, OrderRecord, OrderStatus } from '@snapprint/contracts';
import { getOperatorDocumentDownloadUrl } from '../../src/order-client';
import { OrderQueueActions } from './order-queue-actions';

interface OrderQueueItemProps {
  order: OrderRecord;
  updating: boolean;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onRecordPayment?: (order: OrderRecord) => void;
}

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

export function OrderQueueItem({
  order,
  updating,
  onStatusChange,
  onRecordPayment,
}: OrderQueueItemProps) {
  const paymentStatus = order.paymentStatus ?? 'UNPAID';
  const statusBadge = statusColors[order.status] || statusColors.submitted;
  const paymentBadge = paymentColors[paymentStatus] || paymentColors.UNPAID;
  const lastEvent =
    order.events && order.events.length > 0 ? order.events[order.events.length - 1] : null;

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
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
            Submitted {new Date(order.createdAt).toLocaleTimeString()} · {order.totalSheets} sheets
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
              alignItems: 'center',
              fontSize: '12px',
              marginBottom: '6px',
              flexWrap: 'wrap',
              gap: '4px',
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
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>₹{(item.subtotalMinor / 100).toFixed(2)}</span>
              <a
                href={getOperatorDocumentDownloadUrl(order.studioId, order.orderId, item.assetId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#0284c7',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '32px',
                }}
              >
                📄 View/Print
              </a>
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
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

        <OrderQueueActions
          order={order}
          updating={updating}
          onStatusChange={onStatusChange}
          onRecordPayment={onRecordPayment}
        />
      </div>

      {lastEvent && (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          ℹ️ Last update: <strong>{lastEvent.toStatus.toUpperCase()}</strong> by{' '}
          {lastEvent.operatorName || lastEvent.operatorUserId || 'operator'} at{' '}
          {new Date(lastEvent.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
