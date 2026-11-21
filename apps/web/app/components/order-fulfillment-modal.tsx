'use client';

import React, { useEffect, useState } from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import { fetchOperatorOrderQueue, updateOperatorOrderStatus } from '../../src/order-client';
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

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOperatorOrderQueue(studioId);
      setOrders(res.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [studioId]);

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
