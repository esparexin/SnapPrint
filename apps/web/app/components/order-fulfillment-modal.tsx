'use client';

import React, { useEffect, useState } from 'react';
import { OrderRecord, OrderStatus } from '@snapprint/contracts';
import { fetchOperatorOrderQueue, updateOperatorOrderStatus } from '../../src/order-client';
import { useDialog } from '../hooks/use-dialog';
import { CounterPaymentModal } from './counter-payment-modal';
import { OrderFulfillmentHeader } from './order-fulfillment-header';
import { OrderFulfillmentList } from './order-fulfillment-list';
import { OrderQueueFilterBar } from './order-queue-filter-bar';

interface OrderFulfillmentModalProps {
  studioId: string;
  studioName: string;
  onClose: () => void;
  inShell?: boolean;
}

export function OrderFulfillmentModal({
  studioId,
  studioName,
  onClose,
  inShell = false,
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
      alert(
        msg.includes('PAYMENT_REQUIRED_BEFORE_PRINT') || msg.includes('Payment is required')
          ? '⚠️ Payment Required: This order is unpaid. Under studio policy, you must collect payment before printing.'
          : msg
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function handlePaymentSuccess(updatedOrder: OrderRecord) {
    setOrders((prev) => prev.map((o) => (o.orderId === updatedOrder.orderId ? updatedOrder : o)));
  }

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: !inShell,
    onClose,
    enableSwipeDown: true,
  });

  const content = (
    <>
      <OrderFulfillmentHeader
        studioName={studioName}
        orderCount={orders.length}
        loading={loading}
        onRefresh={loadOrders}
        onClose={inShell ? undefined : onClose}
      />
      <OrderQueueFilterBar statusFilter={statusFilter} onSelectStatus={setStatusFilter} />
      <OrderFulfillmentList
        orders={orders}
        loading={loading}
        error={error}
        updatingId={updatingId}
        onStatusChange={handleStatusChange}
        onRecordPayment={(ord) => setPaymentOrder(ord)}
      />
      {paymentOrder && (
        <CounterPaymentModal
          studioId={studioId}
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );

  if (inShell) {
    return (
      <div className="portal-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-fulfillment-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {content}
      </div>
    </div>
  );
}
