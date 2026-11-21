import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';

describe('Razorpay Webhook Routes', () => {
  const webhookSecret = 'mock_webhook_secret';

  const setupFixture = async () => {
    const ctx = await createTestApp();
    const studio = {
      id: 'studio_test_wh',
      slug: 'wh-print',
      name: 'WH Print',
      status: 'active' as const,
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'payment_required' as const,
        onlinePaymentEnabled: true,
        counterPaymentEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ctx.studios.push(studio);

    const order = {
      orderId: 'ord_wh_test_12345678',
      orderNumber: 'ORD-2026-0002',
      studioId: studio.id,
      sessionId: 'sess_wh_12345678',
      idempotencyKey: 'idemp_key_wh_123',
      customerName: 'Priya Patel',
      customerPhone: '9123456780',
      items: [],
      totalSheets: 10,
      totalAmountMinor: 1000,
      currency: 'INR' as const,
      status: 'submitted' as const,
      paidAmountMinor: 0,
      paymentStatus: 'UNPAID' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ctx.orders.push(order);

    const payment = {
      paymentId: 'pay_wh_test_12345678',
      orderId: order.orderId,
      studioId: studio.id,
      sessionId: order.sessionId,
      method: 'razorpay' as const,
      amountMinor: 1000,
      currency: 'INR' as const,
      status: 'CREATED' as const,
      gatewayOrderId: 'order_rzp_wh_12345',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ctx.payments.push(payment);

    return { ctx, studio, order, payment };
  };

  it('rejects webhook with invalid signature', async () => {
    const { ctx } = await setupFixture();

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: { 'x-razorpay-signature': 'mock_invalid_sig' },
      payload: { event: 'payment.captured' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('processes valid payment.captured webhook and deduplicates duplicates', async () => {
    const { ctx, order, payment } = await setupFixture();

    const eventPayload = {
      id: 'evt_rzp_wh_captured_999',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_captured_999',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventPayload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // First delivery: should process and succeed
    const res1 = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': validSignature,
        'content-type': 'application/json',
      },
      payload: rawBody,
    });

    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body).received).toBe(true);

    const updatedPayment = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updatedPayment?.status).toBe('SUCCEEDED');
    expect(updatedPayment?.gatewayPaymentId).toBe('pay_rzp_captured_999');

    const updatedOrder = ctx.orders.find((o) => o.orderId === order.orderId);
    expect(updatedOrder?.paidAmountMinor).toBe(1000);
    expect(updatedOrder?.paymentStatus).toBe('PAID');

    // Second delivery: duplicate eventId should be idempotently acknowledged
    const res2 = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': validSignature,
        'content-type': 'application/json',
      },
      payload: rawBody,
    });

    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body).duplicate).toBe(true);
  });

  it('processes payment.failed webhook', async () => {
    const { ctx, payment } = await setupFixture();

    const eventPayload = {
      id: 'evt_rzp_wh_failed_888',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_fail_888',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'failed',
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventPayload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': validSignature,
        'content-type': 'application/json',
      },
      payload: rawBody,
    });

    expect(res.statusCode).toBe(200);
    const updatedPayment = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updatedPayment?.status).toBe('FAILED');
  });

  it('allows retry when webhook previously failed', async () => {
    const { ctx, payment, order } = await setupFixture();
    const eventId = 'evt_retry_test_123';

    // Seed event as failed
    ctx.webhookEvents.push({
      eventId,
      eventType: 'payment.captured',
      payload: {},
      status: 'FAILED',
      receivedAt: new Date(),
      error: 'Previous transient failure',
    });

    const eventPayload = {
      id: eventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_retry_999',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventPayload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: {
        'x-razorpay-signature': validSignature,
        'content-type': 'application/json',
      },
      payload: rawBody,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).received).toBe(true);
    expect(JSON.parse(res.body).duplicate).toBeUndefined();

    const updatedPayment = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updatedPayment?.status).toBe('SUCCEEDED');
    const updatedOrder = ctx.orders.find((o) => o.orderId === order.orderId);
    expect(updatedOrder?.paidAmountMinor).toBe(1000);
  });
});
