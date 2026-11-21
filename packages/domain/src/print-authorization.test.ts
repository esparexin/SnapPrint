import { describe, expect, it } from 'vitest';
import { canAuthorizePrint } from './print-authorization.js';

describe('Print Authorization Policy', () => {
  it('allows printing when order is fully PAID under payment_required policy', () => {
    const res = canAuthorizePrint({
      orderPaymentStatus: 'PAID',
      paymentPolicy: 'payment_required',
    });
    expect(res.allowed).toBe(true);
  });

  it('rejects printing when order is UNPAID under payment_required policy', () => {
    const res = canAuthorizePrint({
      orderPaymentStatus: 'UNPAID',
      paymentPolicy: 'payment_required',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('PAYMENT_REQUIRED_BEFORE_PRINT');
  });

  it('rejects printing when order is PARTIALLY_PAID under payment_required policy', () => {
    const res = canAuthorizePrint({
      orderPaymentStatus: 'PARTIALLY_PAID',
      paymentPolicy: 'payment_required',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('PAYMENT_REQUIRED_BEFORE_PRINT');
  });

  it('allows printing when policy is pay_at_counter regardless of payment status', () => {
    const resUnpaid = canAuthorizePrint({
      orderPaymentStatus: 'UNPAID',
      paymentPolicy: 'pay_at_counter',
    });
    expect(resUnpaid.allowed).toBe(true);

    const resFailed = canAuthorizePrint({
      orderPaymentStatus: 'PAYMENT_FAILED',
      paymentPolicy: 'pay_at_counter',
    });
    expect(resFailed.allowed).toBe(true);
  });

  it('allows printing when operator has override permission', () => {
    const res = canAuthorizePrint({
      orderPaymentStatus: 'UNPAID',
      paymentPolicy: 'payment_required',
      hasOverridePermission: true,
    });
    expect(res.allowed).toBe(true);
  });
});
