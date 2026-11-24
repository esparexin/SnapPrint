'use client';

import React, { useEffect, useState } from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import { fetchOperatorOrderQueue, updateOperatorOrderStatus } from '../../src/order-client';
import { useDialog } from '../hooks/use-dialog';
import { CounterPaymentModal } from './counter-payment-modal';
import { OrderQueueItem } from './order-queue-item';

interface OrderFulfillmentModalProps {
  studioId: string;
  studioName: string;
  onClose: () => void;
}

export function OrderFulfillmentModal({
  studioId,
  studioName,
  onClose,
}: OrderFulfillmentModalProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<OrderRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOperatorOrderQueue(
        studioId,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [studioId, statusFilter]);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const updated = await updateOperatorOrderStatus(studioId, orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? updated : o)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      if (msg.includes('PAYMENT_REQUIRED_BEFORE_PRINT') || msg.includes('Payment is required')) {
        alert(
          '⚠️ Payment Required: This order is unpaid. Under studio policy, you must collect payment before printing.'
        );
      } else {
        alert(msg);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function handlePaymentSuccess(updatedOrder: OrderRecord) {
    setOrders((prev) => prev.map((o) => (o.orderId === updatedOrder.orderId ? updatedOrder : o)));
  }

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="dialog-overlay"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '850px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Xerox & Print Fulfillment Queue
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {studioName} · {orders.length} Active Orders
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            overflowX: 'auto',
            flexWrap: 'wrap',
          }}
        >
          {(['all', 'submitted', 'processing', 'ready', 'completed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: statusFilter === st ? '#0284c7' : '#cbd5e1',
                backgroundColor: statusFilter === st ? '#e0f2fe' : '#ffffff',
                color: statusFilter === st ? '#0369a1' : '#475569',
                cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'All Orders' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

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
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}
            >
              Loading incoming jobs...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>No pending orders</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
                Customer print submissions will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {orders.map((order) => (
                <OrderQueueItem
                  key={order.orderId}
                  order={order}
                  updating={updatingId === order.orderId}
                  onStatusChange={handleStatusChange}
                  onRecordPayment={(ord) => setPaymentOrder(ord)}
                />
              ))}
            </div>
          )}
        </div>

        {paymentOrder && (
          <CounterPaymentModal
            studioId={studioId}
            order={paymentOrder}
            onClose={() => setPaymentOrder(null)}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  );
}
