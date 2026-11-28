'use client';

import React, { useState } from 'react';
import { OrderRecord, PublicPaymentSettings } from '@snapprint/contracts';
import { resolveCustomerPaymentMethods } from '@snapprint/domain';
import { SlideToPay } from '../../../components/ui/slide-to-pay';
import { initiateOnlinePayment, verifyOnlinePayment } from '../../../src/payment-client';
import { customerPaymentStyles as styles } from './customer-payment-styles';

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
  payment?: PublicPaymentSettings;
  studioName?: string;
  onPaymentSuccess: () => void;
}

export function CustomerPaymentCard({
  order,
  slug,
  sessionToken,
  payment,
  studioName,
  onPaymentSuccess,
}: CustomerPaymentCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'online' | null>(null);

  const methods = resolveCustomerPaymentMethods(
    payment ?? {
      enableCounterPayment: true,
      enableOnlinePayment: false,
      isRazorpayConfirmed: false,
    }
  );
  const enableOnline = methods.includes('razorpay');
  const paidAmount = order.paidAmountMinor ?? 0;
  const remainingMinor = Math.max(0, order.totalAmountMinor - paidAmount);
  const isPaid = order.paymentStatus === 'PAID';
  const amountFormatted = `₹${(remainingMinor / 100).toFixed(2)}`;

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
          name: studioName || 'SnapPrint Xerox & Print',
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
      {error && <div style={styles.error}>{error}</div>}
      <SlideToPay
        amountFormatted={amountFormatted}
        enableOnline={enableOnline}
        onSelectCash={() => setSelectedMethod('cash')}
        onSelectOnline={handlePayOnline}
        selectedMethod={selectedMethod}
        loading={loading}
        onReset={() => setSelectedMethod(null)}
      />
      {(!enableOnline || selectedMethod === 'cash') && (
        <div style={styles.counterAlert}>
          💵 <strong>Pay at Counter (Cash or UPI)</strong>: Show Order #{order.orderNumber} at the
          desk to pay via cash or counter UPI QR stand.
        </div>
      )}
    </div>
  );
}
