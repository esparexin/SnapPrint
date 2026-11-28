'use client';

import React from 'react';
import { ConfirmModal } from './confirm-modal';

interface OrderCancelModalProps {
  orderNumber: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function OrderCancelModal({ orderNumber, onConfirm, onClose }: OrderCancelModalProps) {
  return (
    <ConfirmModal
      isOpen
      isNested
      title="Cancel Order"
      message={
        <span>
          Are you sure you want to cancel order <strong>{orderNumber}</strong>?
        </span>
      }
      confirmLabel="Yes, Cancel Order"
      cancelLabel="Keep Order"
      variant="danger"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
