'use client';

import React, { useState } from 'react';
import { OrderRecord, OrderStatus, QuoteItemBreakdown } from '@snapprint/contracts';
import { useDialog } from '../hooks/use-dialog';
import { useOperatorQueue } from '../hooks/use-operator-queue';
import { OrderFulfillmentHeader } from './order-fulfillment-header';
import { OrderFulfillmentList } from './order-fulfillment-list';
import { OrderFulfillmentOverlays } from './order-fulfillment-overlays';
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentOrder, setPaymentOrder] = useState<OrderRecord | null>(null);
  const [handoverOrder, setHandoverOrder] = useState<OrderRecord | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{
    order: OrderRecord;
    item: QuoteItemBreakdown;
  } | null>(null);

  const {
    orders,
    loading,
    error,
    successMessage,
    updatingId,
    loadOrders,
    handleStatusChange,
    handleDeleteDocument,
    handlePaymentSuccess,
    handleRetryPrint,
    clearFeedback,
  } = useOperatorQueue(studioId, statusFilter);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: !inShell,
    onClose,
    enableSwipeDown: true,
  });

  async function handleConfirmHandover() {
    if (!handoverOrder) return;
    await handleStatusChange(handoverOrder.orderId, 'completed', true);
    setHandoverOrder(null);
  }

  async function onDeleteDocument(orderId: string, assetId: string) {
    await handleDeleteDocument(orderId, assetId);
    if (previewTarget?.item.assetId === assetId) {
      setPreviewTarget((prev) =>
        prev ? { ...prev, item: { ...prev.item, isDeleted: true } } : null
      );
    }
  }

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
        successMessage={successMessage}
        updatingId={updatingId}
        onStatusChange={(id, st) => handleStatusChange(id, st)}
        onCollectPayment={(ord) => setPaymentOrder(ord)}
        onRecordPayment={(ord) => setPaymentOrder(ord)}
        onRequestHandover={(ord) => setHandoverOrder(ord)}
        onPreviewItem={(ord, it) => setPreviewTarget({ order: ord, item: it })}
        onDeleteDocument={onDeleteDocument}
        onRetryPrint={handleRetryPrint}
        onDismissError={clearFeedback}
        onDismissSuccess={clearFeedback}
      />
      <OrderFulfillmentOverlays
        studioId={studioId}
        paymentOrder={paymentOrder}
        handoverOrder={handoverOrder}
        previewTarget={previewTarget}
        onClosePayment={() => setPaymentOrder(null)}
        onPaymentSuccess={handlePaymentSuccess}
        onCloseHandover={() => setHandoverOrder(null)}
        onConfirmHandover={handleConfirmHandover}
        onClosePreview={() => setPreviewTarget(null)}
        onDeleteDocument={onDeleteDocument}
      />
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
