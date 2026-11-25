import type { OrderPaymentStatus, OrderStatus, PaymentRecord } from '@snapprint/contracts';

export interface DerivedPaymentSummary {
  paidAmountMinor: number;
  paymentStatus: OrderPaymentStatus;
}

export function deriveOrderPaymentStatus(
  totalAmountMinor: number,
  payments: readonly Pick<PaymentRecord, 'status' | 'amountMinor'>[]
): DerivedPaymentSummary {
  const successfulPayments = payments.filter((p) => p.status === 'SUCCEEDED');
  const paidAmountMinor = successfulPayments.reduce((sum, p) => sum + p.amountMinor, 0);

  if (paidAmountMinor >= totalAmountMinor && totalAmountMinor > 0) {
    return { paidAmountMinor, paymentStatus: 'PAID' };
  }

  if (paidAmountMinor > 0) {
    return { paidAmountMinor, paymentStatus: 'PARTIALLY_PAID' };
  }

  const hasFailedPayment = payments.some((p) => p.status === 'FAILED');
  if (hasFailedPayment) {
    return { paidAmountMinor: 0, paymentStatus: 'PAYMENT_FAILED' };
  }

  return { paidAmountMinor: 0, paymentStatus: 'UNPAID' };
}

export interface PaymentAttemptValidation {
  valid: boolean;
  error?: 'ORDER_CANCELLED' | 'ORDER_ALREADY_PAID' | 'INVALID_AMOUNT' | 'AMOUNT_EXCEEDS_REMAINING';
  remainingMinor: number;
}

export function isOrderEligibleForPayment(order: {
  status: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  totalAmountMinor?: number;
  paidAmountMinor?: number;
}): boolean {
  if (order.status === 'cancelled') {
    return false;
  }
  if (order.paymentStatus === 'PAID') {
    return false;
  }
  if (
    order.totalAmountMinor !== undefined &&
    order.paidAmountMinor !== undefined &&
    order.totalAmountMinor > 0 &&
    order.paidAmountMinor >= order.totalAmountMinor
  ) {
    return false;
  }
  return true;
}

export function validatePaymentAttempt(
  order: {
    totalAmountMinor: number;
    paidAmountMinor: number;
    paymentStatus: OrderPaymentStatus;
    status?: OrderStatus;
  },
  attemptAmountMinor: number
): PaymentAttemptValidation {
  if (order.status === 'cancelled') {
    return { valid: false, error: 'ORDER_CANCELLED', remainingMinor: 0 };
  }

  const remainingMinor = Math.max(0, order.totalAmountMinor - order.paidAmountMinor);

  if (order.paymentStatus === 'PAID' || remainingMinor === 0) {
    return { valid: false, error: 'ORDER_ALREADY_PAID', remainingMinor: 0 };
  }

  if (!Number.isInteger(attemptAmountMinor) || attemptAmountMinor <= 0) {
    return { valid: false, error: 'INVALID_AMOUNT', remainingMinor };
  }

  if (attemptAmountMinor > remainingMinor) {
    return { valid: false, error: 'AMOUNT_EXCEEDS_REMAINING', remainingMinor };
  }

  return { valid: true, remainingMinor };
}
