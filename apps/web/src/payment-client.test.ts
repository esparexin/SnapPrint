import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCustomerPaymentHistory,
  initiateOnlinePayment,
  PaymentApiError,
  recordOperatorCounterPayment,
  verifyOnlinePayment,
} from './payment-client.js';

describe('payment-client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initiates online payment successfully', async () => {
    const mockRes = {
      paymentId: 'pay_test_12345678',
      orderId: 'ord_test_12345678',
      amountMinor: 500,
      currency: 'INR',
      gatewayOrderId: 'order_rzp_mock_123',
      keyId: 'rzp_test_key',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await initiateOnlinePayment('quick-print', 'ord_test_12345678', 'token_123');
    expect(res.paymentId).toBe('pay_test_12345678');
    expect(res.gatewayOrderId).toBe('order_rzp_mock_123');
  });

  it('verifies online payment successfully', async () => {
    const mockRes = {
      paymentId: 'pay_test_12345678',
      orderId: 'ord_test_12345678',
      studioId: 'studio-test',
      method: 'razorpay',
      amountMinor: 500,
      currency: 'INR',
      status: 'SUCCEEDED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await verifyOnlinePayment(
      'quick-print',
      'ord_test_12345678',
      {
        paymentId: 'pay_test_12345678',
        gatewayOrderId: 'order_rzp_123',
        gatewayPaymentId: 'pay_rzp_456',
        gatewaySignature: 'sig_valid',
      },
      'token_123'
    );

    expect(res.status).toBe('SUCCEEDED');
  });

  it('fetches customer payment history successfully', async () => {
    const mockRes = {
      payments: [],
      totalPaidMinor: 0,
      paymentStatus: 'UNPAID',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await fetchCustomerPaymentHistory('quick-print', 'ord_test_12345678', 'token_123');
    expect(res.paymentStatus).toBe('UNPAID');
    expect(res.totalPaidMinor).toBe(0);
  });

  it('records operator counter payment successfully', async () => {
    const mockRes = {
      payment: {
        paymentId: 'pay_cnt_12345678',
        orderId: 'ord_test_12345678',
        studioId: 'studio-test',
        method: 'counter_cash',
        amountMinor: 300,
        currency: 'INR',
        status: 'SUCCEEDED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      order: {
        orderId: 'ord_test_12345678',
        orderNumber: 'ORD-001',
        studioId: 'studio-test',
        sessionId: 'sess_test_12345678',
        idempotencyKey: 'idemp_123',
        items: [],
        totalSheets: 3,
        totalAmountMinor: 300,
        currency: 'INR',
        status: 'submitted',
        paidAmountMinor: 300,
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRes,
    } as Response);

    const res = await recordOperatorCounterPayment('studio-test', 'ord_test_12345678', {
      method: 'counter_cash',
      amountMinor: 300,
    });

    expect(res.payment.method).toBe('counter_cash');
    expect(res.order.paymentStatus).toBe('PAID');
  });

  it('throws PaymentApiError with code on failed request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ code: 'INVALID_PAYMENT_SIGNATURE', message: 'Signature mismatch' }),
    } as Response);

    await expect(
      verifyOnlinePayment('quick-print', 'ord_test_12345678', {
        paymentId: 'pay_test_12345678',
        gatewayOrderId: 'order_rzp_123',
        gatewayPaymentId: 'pay_rzp_456',
        gatewaySignature: 'sig_bad',
      })
    ).rejects.toThrow(PaymentApiError);
  });
});
