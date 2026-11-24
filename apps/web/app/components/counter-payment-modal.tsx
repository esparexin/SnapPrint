'use client';

import React, { CSSProperties, useState } from 'react';
import { OrderRecord } from '@snapprint/contracts';
import { recordOperatorCounterPayment } from '../../src/payment-client';
import { useDialog } from '../hooks/use-dialog';

interface CounterPaymentModalProps {
  studioId: string;
  order: OrderRecord;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: OrderRecord) => void;
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  amountBox: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#334155',
  },
  errorBox: {
    padding: '10px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '8px',
  },
  btnCancel: {
    flex: 1,
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnConfirm: {
    flex: 2,
    padding: '10px 14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export function CounterPaymentModal({
  studioId,
  order,
  onClose,
  onPaymentSuccess,
}: CounterPaymentModalProps) {
  const paidMinor = order.paidAmountMinor ?? 0;
  const remainingMinor = Math.max(0, order.totalAmountMinor - paidMinor);
  const formattedRemaining = (remainingMinor / 100).toFixed(2);
  const [method, setMethod] = useState<'counter_cash' | 'counter_upi'>('counter_cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await recordOperatorCounterPayment(studioId, order.orderId, {
        method,
        amountMinor: remainingMinor,
      });
      onPaymentSuccess(res.order);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record counter payment');
    } finally {
      setSubmitting(false);
    }
  }

  const methodBtnStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    border: active ? '2px solid #16a34a' : '1px solid #cbd5e1',
    backgroundColor: active ? '#f0fdf4' : '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? 700 : 500,
    color: active ? '#15803d' : '#334155',
  });

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
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '440px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={styles.header}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            Collect Counter Payment
          </h3>
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

        <div style={styles.infoBox}>
          <div>
            <strong>Order:</strong> #{order.orderNumber} ({order.customerName || 'Walk-in Customer'}
            )
          </div>
          <div style={{ marginTop: '4px', color: '#64748b' }}>
            Predefined print charges calculate the exact bill. No manual amount entry needed.
          </div>
        </div>

        <div style={styles.amountBox}>
          <div
            style={{
              fontSize: '12px',
              color: '#15803d',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            Exact Bill to Collect
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
            ₹{formattedRemaining}
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={styles.label}>Select Payment Received</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={methodBtnStyle(method === 'counter_cash')}>
                <input
                  type="radio"
                  name="method"
                  value="counter_cash"
                  checked={method === 'counter_cash'}
                  onChange={() => setMethod('counter_cash')}
                  style={{ display: 'none' }}
                />
                💵 Cash (నగదు)
              </label>
              <label style={methodBtnStyle(method === 'counter_upi')}>
                <input
                  type="radio"
                  name="method"
                  value="counter_upi"
                  checked={method === 'counter_upi'}
                  onChange={() => setMethod('counter_upi')}
                  style={{ display: 'none' }}
                />
                📱 Shop UPI QR
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.btnConfirm,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting
                ? 'Confirming...'
                : `Confirm ₹${formattedRemaining} ${method === 'counter_cash' ? 'Cash' : 'UPI'} Received`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
