'use client';

import React from 'react';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { CounterPaymentModal } from './counter-payment-modal';
import { OrderDocumentPreviewModal } from './order-document-preview-modal';
import { OrderHandoverConfirmModal } from './order-handover-confirm-modal';

interface OrderFulfillmentOverlaysProps {
  studioId: string;
  paymentOrder: OrderRecord | null;
  handoverOrder: OrderRecord | null;
  previewTarget: { order: OrderRecord; item: QuoteItemBreakdown } | null;
  onClosePayment: () => void;
  onPaymentSuccess: (ord: OrderRecord) => void;
  onCloseHandover: () => void;
  onConfirmHandover: () => Promise<void>;
  onClosePreview: () => void;
  onDeleteDocument: (orderId: string, assetId: string) => Promise<void>;
  onUnavailable?: (assetId: string) => void;
}

export function OrderFulfillmentOverlays({
  studioId,
  paymentOrder,
  handoverOrder,
  previewTarget,
  onClosePayment,
  onPaymentSuccess,
  onCloseHandover,
  onConfirmHandover,
  onClosePreview,
  onDeleteDocument,
  onUnavailable,
}: OrderFulfillmentOverlaysProps) {
  return (
    <>
      {paymentOrder && (
        <CounterPaymentModal
          studioId={studioId}
          order={paymentOrder}
          onClose={onClosePayment}
          onPaymentSuccess={onPaymentSuccess}
        />
      )}
      {handoverOrder && (
        <OrderHandoverConfirmModal
          order={handoverOrder}
          onClose={onCloseHandover}
          onConfirm={onConfirmHandover}
        />
      )}
      {previewTarget && (
        <OrderDocumentPreviewModal
          studioId={studioId}
          order={previewTarget.order}
          item={previewTarget.item}
          onClose={onClosePreview}
          onDeleteDocument={onDeleteDocument}
          onUnavailable={onUnavailable}
        />
      )}
    </>
  );
}
