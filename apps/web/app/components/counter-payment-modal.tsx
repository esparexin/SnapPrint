'use client';

import React, { CSSProperties, useState } from 'react';
import { OrderRecord } from '@snapprint/contracts';
import { recordOperatorCounterPayment } from '../../src/payment-client';

interface CounterPaymentModalProps {
  studioId: string;
  order: OrderRecord;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: OrderRecord) => void;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '480px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
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
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
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
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: '13px',
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
  const [method, setMethod] = useState<'counter_cash' | 'counter_upi'>('counter_cash');
  const [amountRupees, setAmountRupees] = useState<string>((remainingMinor / 100).toString());
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = Math.round(parseFloat(amountRupees) * 100);

    if (isNaN(amountMinor) || amountMinor <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    if (amountMinor > remainingMinor) {
      setError(`Amount cannot exceed remaining balance of ₹${(remainingMinor / 100).toFixed(2)}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordOperatorCounterPayment(studioId, order.orderId, {
        method,
        amountMinor,
        notes: notes.trim() || undefined,
      });
      onPaymentSuccess(res.order);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record counter payment');
    } finally {
      setSubmitting(false);
    }
  }

  const methodStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px',
    border: active ? '2px solid #0284c7' : '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            Record Counter Payment
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
            <strong>Order:</strong> {order.orderNumber} ({order.customerName || 'Walk-in'})
          </div>
          <div style={{ marginTop: '4px' }}>
            <strong>Total:</strong> ₹{(order.totalAmountMinor / 100).toFixed(2)} ·{' '}
            <strong>Paid:</strong> ₹{(paidMinor / 100).toFixed(2)}
          </div>
          <div style={{ marginTop: '4px', color: '#0369a1', fontWeight: 700 }}>
            Remaining Balance: ₹{(remainingMinor / 100).toFixed(2)}
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={styles.label}>Payment Method</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={methodStyle(method === 'counter_cash')}>
                <input
                  type="radio"
                  name="method"
                  value="counter_cash"
                  checked={method === 'counter_cash'}
                  onChange={() => setMethod('counter_cash')}
                />
                💵 Cash
              </label>
              <label style={methodStyle(method === 'counter_upi')}>
                <input
                  type="radio"
                  name="method"
                  value="counter_upi"
                  checked={method === 'counter_upi'}
                  onChange={() => setMethod('counter_upi')}
                />
                📱 Counter UPI QR
              </label>
            </div>
          </div>

          <div>
            <label style={styles.label}>Amount (₹)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max={(remainingMinor / 100).toString()}
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. UPI ref or cash notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={styles.btnConfirm}>
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
