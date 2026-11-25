'use client';

import React, { useState } from 'react';
import { OrderRecord } from '@snapprint/contracts';
import { useDialog } from '../hooks/use-dialog';
import { OrderHandoverChecklist } from './order-handover-checklist';

interface OrderHandoverConfirmModalProps {
  order: OrderRecord;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function OrderHandoverConfirmModal({
  order,
  onClose,
  onConfirm,
}: OrderHandoverConfirmModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  async function handleSubmit() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="handover-modal-title"
      className="dialog-overlay max-md:items-end"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content pb-safe max-md:rounded-b-none"
        style={{ maxWidth: '560px', width: '100%', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />

        <div style={{ marginBottom: '12px' }}>
          <h2
            id="handover-modal-title"
            style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}
          >
            Customer Handover · Order {order.orderNumber}
          </h2>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
            Verify physical print output matches all job requirements before releasing to customer.
          </div>
        </div>

        <OrderHandoverChecklist items={order.items} />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 0',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: '20px', height: '20px', minWidth: '20px', fontSize: '16px' }}
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
            I have verified that all physical printed pages match this order and confirmed handover
            to customer.
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              minHeight: '44px',
              padding: '10px 16px',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!confirmed || submitting}
            style={{
              minHeight: '44px',
              padding: '10px 18px',
              backgroundColor: confirmed && !submitting ? '#15803d' : '#94a3b8',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: confirmed && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Confirming...' : 'Confirm Handover & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
