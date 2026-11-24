'use client';

import React from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import { OrderQueueEmptyState } from './order-queue-empty-state';
import { OrderQueueItem } from './order-queue-item';

interface OrderFulfillmentListProps {
  orders: OrderRecord[];
  loading: boolean;
  error: string | null;
  updatingId: string | null;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onRecordPayment: (order: OrderRecord) => void;
}

export function OrderFulfillmentList({
  orders,
  loading,
  error,
  updatingId,
  onStatusChange,
  onRecordPayment,
}: OrderFulfillmentListProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
          Loading incoming jobs...
        </div>
      ) : orders.length === 0 ? (
        <OrderQueueEmptyState />
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {orders.map((order) => (
            <OrderQueueItem
              key={order.orderId}
              order={order}
              updating={updatingId === order.orderId}
              onStatusChange={onStatusChange}
              onRecordPayment={onRecordPayment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
