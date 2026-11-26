import { describe, expect, it } from 'vitest';
import {
  deriveOrderPaymentStatus,
  isOrderEligibleForPayment,
  validatePaymentAttempt,
} from './payment-calculator.js';

describe('Payment Calculator', () => {
  describe('deriveOrderPaymentStatus', () => {
    it('returns UNPAID when no payments exist', () => {
      const summary = deriveOrderPaymentStatus(500, []);
      expect(summary.paidAmountMinor).toBe(0);
      expect(summary.paymentStatus).toBe('UNPAID');
    });

    it('returns PAYMENT_FAILED when only failed payments exist', () => {
      const summary = deriveOrderPaymentStatus(500, [{ status: 'FAILED', amountMinor: 500 }]);
      expect(summary.paidAmountMinor).toBe(0);
      expect(summary.paymentStatus).toBe('PAYMENT_FAILED');
    });

    it('returns PARTIALLY_PAID when paid amount is less than total', () => {
      const summary = deriveOrderPaymentStatus(1000, [
        { status: 'SUCCEEDED', amountMinor: 400 },
        { status: 'FAILED', amountMinor: 600 },
      ]);
      expect(summary.paidAmountMinor).toBe(400);
      expect(summary.paymentStatus).toBe('PARTIALLY_PAID');
    });

    it('returns PAID when paid amount equals total amount', () => {
      const summary = deriveOrderPaymentStatus(1000, [
        { status: 'SUCCEEDED', amountMinor: 600 },
        { status: 'SUCCEEDED', amountMinor: 400 },
      ]);
      expect(summary.paidAmountMinor).toBe(1000);
      expect(summary.paymentStatus).toBe('PAID');
    });

    it('returns PAID when paid amount exceeds total amount', () => {
      const summary = deriveOrderPaymentStatus(500, [{ status: 'SUCCEEDED', amountMinor: 600 }]);
      expect(summary.paidAmountMinor).toBe(600);
      expect(summary.paymentStatus).toBe('PAID');
    });

    it('returns REFUNDED when payments have been refunded and no succeeded payments remain', () => {
      const summary = deriveOrderPaymentStatus(4000, [{ status: 'REFUNDED', amountMinor: 4000 }]);
      expect(summary.paidAmountMinor).toBe(0);
      expect(summary.paymentStatus).toBe('REFUNDED');
    });
  });

  describe('isOrderEligibleForPayment', () => {
    it('returns false when order is cancelled', () => {
      expect(isOrderEligibleForPayment({ status: 'cancelled', paymentStatus: 'UNPAID' })).toBe(
        false
      );
      expect(
        isOrderEligibleForPayment({ status: 'cancelled', paymentStatus: 'PARTIALLY_PAID' })
      ).toBe(false);
    });

    it('returns false when order is already PAID', () => {
      expect(isOrderEligibleForPayment({ status: 'submitted', paymentStatus: 'PAID' })).toBe(false);
      expect(isOrderEligibleForPayment({ status: 'ready', paymentStatus: 'PAID' })).toBe(false);
    });

    it('returns false when paid amount meets or exceeds total', () => {
      expect(
        isOrderEligibleForPayment({
          status: 'submitted',
          paymentStatus: 'UNPAID',
          totalAmountMinor: 500,
          paidAmountMinor: 500,
        })
      ).toBe(false);
    });

    it('returns true when order is active and unpaid or partially paid', () => {
      expect(isOrderEligibleForPayment({ status: 'submitted', paymentStatus: 'UNPAID' })).toBe(
        true
      );
      expect(isOrderEligibleForPayment({ status: 'processing', paymentStatus: 'UNPAID' })).toBe(
        true
      );
      expect(isOrderEligibleForPayment({ status: 'ready', paymentStatus: 'PARTIALLY_PAID' })).toBe(
        true
      );
      expect(isOrderEligibleForPayment({ status: 'completed', paymentStatus: 'UNPAID' })).toBe(
        true
      );
    });
  });

  describe('validatePaymentAttempt', () => {
    it('allows valid payment attempt for remaining balance', () => {
      const validation = validatePaymentAttempt(
        { totalAmountMinor: 1000, paidAmountMinor: 400, paymentStatus: 'PARTIALLY_PAID' },
        600
      );
      expect(validation.valid).toBe(true);
      expect(validation.remainingMinor).toBe(600);
    });

    it('rejects attempt if order is cancelled', () => {
      const validation = validatePaymentAttempt(
        {
          totalAmountMinor: 1000,
          paidAmountMinor: 0,
          paymentStatus: 'UNPAID',
          status: 'cancelled',
        },
        500
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('ORDER_CANCELLED');
      expect(validation.remainingMinor).toBe(0);
    });

    it('rejects attempt if order is already PAID', () => {
      const validation = validatePaymentAttempt(
        { totalAmountMinor: 1000, paidAmountMinor: 1000, paymentStatus: 'PAID' },
        100
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('ORDER_ALREADY_PAID');
    });

    it('rejects negative or zero attempt amounts', () => {
      const validationZero = validatePaymentAttempt(
        { totalAmountMinor: 500, paidAmountMinor: 0, paymentStatus: 'UNPAID' },
        0
      );
      expect(validationZero.valid).toBe(false);
      expect(validationZero.error).toBe('INVALID_AMOUNT');

      const validationNeg = validatePaymentAttempt(
        { totalAmountMinor: 500, paidAmountMinor: 0, paymentStatus: 'UNPAID' },
        -50
      );
      expect(validationNeg.valid).toBe(false);
      expect(validationNeg.error).toBe('INVALID_AMOUNT');
    });

    it('rejects attempt exceeding remaining balance', () => {
      const validation = validatePaymentAttempt(
        { totalAmountMinor: 1000, paidAmountMinor: 700, paymentStatus: 'PARTIALLY_PAID' },
        350
      );
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('AMOUNT_EXCEEDS_REMAINING');
      expect(validation.remainingMinor).toBe(300);
    });
  });
});
