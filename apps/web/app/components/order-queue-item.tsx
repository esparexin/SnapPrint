'use client';

import React from 'react';
import {
  OrderPaymentStatus,
  OrderRecord,
  OrderStatus,
  QuoteItemBreakdown,
} from '@snapprint/contracts';
import { OrderQueueActions } from './order-queue-actions';
import { OrderQueueDocumentRow } from './order-queue-document-row';

interface OrderQueueItemProps {
  order: OrderRecord;
  updating: boolean;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCollectPayment?: (order: OrderRecord) => void;
  onRecordPayment?: (order: OrderRecord) => void;
  onRequestHandover?: (order: OrderRecord) => void;
  onPreviewItem: (order: OrderRecord, item: QuoteItemBreakdown) => void;
  onDeleteDocument?: (orderId: string, assetId: string) => Promise<void>;
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
  REFUNDED: { bg: '#ede9fe', text: '#5b21b6' },
};

export function OrderQueueItem({
  order,
  updating,
  onStatusChange,
  onCollectPayment,
  onRecordPayment,
  onRequestHandover,
  onPreviewItem,
  onDeleteDocument,
}: OrderQueueItemProps) {
  const paymentStatus = order.paymentStatus ?? 'UNPAID';
  const statusBadge = statusColors[order.status] || statusColors.submitted;
  const paymentBadge = paymentColors[paymentStatus] || paymentColors.UNPAID;
  const lastEvent = order.events?.length ? order.events[order.events.length - 1] : null;

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 14px',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
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
          padding: '8px 10px',
          borderRadius: '6px',
          marginBottom: '10px',
        }}
      >
        {order.items.map((item, idx) => (
          <OrderQueueDocumentRow
            key={item.assetId || idx}
            order={order}
            item={item}
            onPreview={onPreviewItem}
            onDeleteDocument={onDeleteDocument}
          />
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
          onCollectPayment={onCollectPayment}
          onRecordPayment={onRecordPayment}
          onRequestHandover={onRequestHandover}
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
