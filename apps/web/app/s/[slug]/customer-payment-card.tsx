'use client';

import React, { useState } from 'react';
import { OrderRecord } from '@snapprint/contracts';
import { initiateOnlinePayment, verifyOnlinePayment } from '../../../src/payment-client';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => Promise<void>;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface CustomerPaymentCardProps {
  order: OrderRecord;
  slug: string;
  sessionToken?: string;
  onPaymentSuccess: () => void;
}

const styles = {
  paidBox: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  paidBadge: {
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '11px',
  } as const,
  card: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'left',
  } as const,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as const,
  badge: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '11px',
  } as const,
  error: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: '4px',
    fontSize: '12px',
  } as const,
  actions: { display: 'flex', gap: '10px', marginTop: '14px' } as const,
  payBtn: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '13px',
  } as const,
  counterBox: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#334155',
    lineHeight: 1.3,
  } as const,
};

export function CustomerPaymentCard({
  order,
  slug,
  sessionToken,
  onPaymentSuccess,
}: CustomerPaymentCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidAmount = order.paidAmountMinor ?? 0;
  const remainingMinor = Math.max(0, order.totalAmountMinor - paidAmount);
  const isPaid = order.paymentStatus === 'PAID';

  async function handlePayOnline() {
    setLoading(true);
    setError(null);
    try {
      const init = await initiateOnlinePayment(slug, order.orderId, sessionToken);

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: init.keyId,
          amount: init.amountMinor,
          currency: init.currency,
          name: 'SnapPrint Xerox & Print',
          description: `Order ${order.orderNumber}`,
          order_id: init.gatewayOrderId,
          prefill: { name: init.customerName || '', contact: init.customerPhone || '' },
          theme: { color: '#0284c7' },
          modal: { ondismiss: () => setLoading(false) },
          handler: async (response: RazorpayResponse) => {
            try {
              const verified = await verifyOnlinePayment(
                slug,
                order.orderId,
                {
                  paymentId: init.paymentId,
                  gatewayOrderId: response.razorpay_order_id,
                  gatewayPaymentId: response.razorpay_payment_id,
                  gatewaySignature: response.razorpay_signature,
                },
                sessionToken
              );
              if (verified.status === 'SUCCEEDED') onPaymentSuccess();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Online payment verification failed');
            } finally {
              setLoading(false);
            }
          },
        });
        rzp.open();
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        const verified = await verifyOnlinePayment(
          slug,
          order.orderId,
          {
            paymentId: init.paymentId,
            gatewayOrderId: init.gatewayOrderId,
            gatewayPaymentId: `pay_mock_${Date.now()}`,
            gatewaySignature: 'mock_valid_signature',
          },
          sessionToken
        );
        if (verified.status === 'SUCCEEDED') onPaymentSuccess();
        return;
      }

      throw new Error('Payment gateway SDK is not loaded. Please refresh the page and try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Online payment failed');
    } finally {
      setLoading(false);
    }
  }

  if (isPaid) {
    return (
      <div style={styles.paidBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💳</span>
          <div>
            <div style={{ fontWeight: 800, color: '#166534', fontSize: '14px' }}>
              Payment Completed (PAID)
            </div>
            <div style={{ fontSize: '12px', color: '#15803d' }}>
              Full amount of ₹{(paidAmount / 100).toFixed(2)} received
            </div>
          </div>
        </div>
        <span style={styles.paidBadge}>PAID</span>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: '14px' }}>
            Payment Pending: ₹{(remainingMinor / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
            Choose your preferred payment method below
          </div>
        </div>
        <span style={styles.badge}>{order.paymentStatus ?? 'UNPAID'}</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        <button
          type="button"
          onClick={handlePayOnline}
          disabled={loading}
          style={{ ...styles.payBtn, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Processing...' : '⚡ Pay Online (UPI / Card)'}
        </button>
        <div style={styles.counterBox}>
          💵 <strong>Pay at Counter</strong>: Show your order number to pay cash or UPI at the desk.
        </div>
      </div>
    </div>
  );
}
