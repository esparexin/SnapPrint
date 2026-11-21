import { describe, expect, it } from 'vitest';
import {
  PaymentMethodSchema,
  PaymentStatusSchema,
  OrderPaymentStatusSchema,
  PaymentRecordSchema,
  PaymentInitiateRequestSchema,
  PaymentInitiateResponseSchema,
  PaymentVerifyRequestSchema,
  CounterPaymentRequestSchema,
  PaymentHistoryResponseSchema,
  WebhookEventRecordSchema,
} from './payment.js';

describe('Payment Contracts', () => {
  it('validates payment methods', () => {
    expect(PaymentMethodSchema.parse('razorpay')).toBe('razorpay');
    expect(PaymentMethodSchema.parse('counter_cash')).toBe('counter_cash');
    expect(PaymentMethodSchema.parse('counter_upi')).toBe('counter_upi');
    expect(() => PaymentMethodSchema.parse('bitcoin')).toThrow();
  });

  it('validates payment statuses', () => {
    expect(PaymentStatusSchema.parse('CREATED')).toBe('CREATED');
    expect(PaymentStatusSchema.parse('SUCCEEDED')).toBe('SUCCEEDED');
    expect(PaymentStatusSchema.parse('FAILED')).toBe('FAILED');
    expect(() => PaymentStatusSchema.parse('UNKNOWN')).toThrow();
  });

  it('validates order payment statuses', () => {
    expect(OrderPaymentStatusSchema.parse('UNPAID')).toBe('UNPAID');
    expect(OrderPaymentStatusSchema.parse('PARTIALLY_PAID')).toBe('PARTIALLY_PAID');
    expect(OrderPaymentStatusSchema.parse('PAID')).toBe('PAID');
    expect(OrderPaymentStatusSchema.parse('PAYMENT_FAILED')).toBe('PAYMENT_FAILED');
  });

  it('validates full PaymentRecord', () => {
    const record = {
      paymentId: 'pay_rec_test_12345678',
      orderId: 'ord_rec_test_12345678',
      studioId: 'studio-test',
      sessionId: 'sess_test_12345678',
      method: 'razorpay' as const,
      amountMinor: 500,
      currency: 'INR' as const,
      status: 'SUCCEEDED' as const,
      gatewayOrderId: 'order_rzp_123',
      gatewayPaymentId: 'pay_rzp_456',
      gatewaySignature: 'sig_123456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = PaymentRecordSchema.parse(record);
    expect(parsed.paymentId).toBe(record.paymentId);
    expect(parsed.amountMinor).toBe(500);
  });

  it('rejects non-positive payment amount in record', () => {
    expect(() =>
      PaymentRecordSchema.parse({
        paymentId: 'pay_rec_test_12345678',
        orderId: 'ord_rec_test_12345678',
        studioId: 'studio-test',
        method: 'counter_cash',
        amountMinor: 0,
        currency: 'INR',
        status: 'SUCCEEDED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow();
  });

  it('validates PaymentInitiateRequest and Response', () => {
    const req = PaymentInitiateRequestSchema.parse({
      orderId: 'ord_test_12345678',
      method: 'razorpay',
    });
    expect(req.method).toBe('razorpay');

    const res = PaymentInitiateResponseSchema.parse({
      paymentId: 'pay_init_12345678',
      orderId: 'ord_test_12345678',
      amountMinor: 1200,
      currency: 'INR',
      gatewayOrderId: 'order_rzp_mock_123',
      keyId: 'rzp_test_key',
    });
    expect(res.amountMinor).toBe(1200);
  });

  it('validates PaymentVerifyRequest', () => {
    const req = PaymentVerifyRequestSchema.parse({
      paymentId: 'pay_init_12345678',
      gatewayOrderId: 'order_rzp_123',
      gatewayPaymentId: 'pay_rzp_456',
      gatewaySignature: 'sig_valid',
    });
    expect(req.paymentId).toBe('pay_init_12345678');
  });

  it('validates CounterPaymentRequest', () => {
    const cash = CounterPaymentRequestSchema.parse({
      method: 'counter_cash',
      amountMinor: 350,
      notes: 'Customer paid exact cash',
    });
    expect(cash.method).toBe('counter_cash');

    const upi = CounterPaymentRequestSchema.parse({
      method: 'counter_upi',
      amountMinor: 500,
    });
    expect(upi.method).toBe('counter_upi');
  });

  it('validates PaymentHistoryResponse', () => {
    const history = PaymentHistoryResponseSchema.parse({
      payments: [],
      totalPaidMinor: 0,
      paymentStatus: 'UNPAID',
    });
    expect(history.totalPaidMinor).toBe(0);
    expect(history.paymentStatus).toBe('UNPAID');
  });

  it('validates WebhookEventRecord', () => {
    const event = WebhookEventRecordSchema.parse({
      eventId: 'evt_rzp_123456',
      eventType: 'payment.captured',
      payload: { test: true },
      processedAt: new Date().toISOString(),
    });
    expect(event.eventId).toBe('evt_rzp_123456');
  });
});
