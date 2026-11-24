import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';

describe('Razorpay Webhook Routes', () => {
  const webhookSecret = 'mock_webhook_secret';
  const sign = (body: string) =>
    crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

  const postWebhook = (app: FastifyInstance, body: string, sig?: string) =>
    app.inject({
      method: 'POST',
      url: '/webhooks/razorpay',
      headers: { 'x-razorpay-signature': sig ?? sign(body), 'content-type': 'application/json' },
      payload: body,
    });

  const setupFixture = async () => {
    const ctx = await createTestApp();
    const now = new Date();
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
    };
    ctx.payments.push(payment);

    return { ctx, studio, order, payment };
  };

  it('rejects webhook with invalid signature', async () => {
    const { ctx } = await setupFixture();
    const res = await postWebhook(
      ctx.app,
      JSON.stringify({ event: 'payment.captured' }),
      'mock_invalid_sig'
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('extracts signed event.created_at as capture time, and deduplicates duplicates', async () => {
    const { ctx, order, payment } = await setupFixture();
    const rawBody = JSON.stringify({
      id: 'evt_rzp_wh_captured_999',
      event: 'payment.captured',
      created_at: 1700000050,
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_captured_999',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'captured',
            created_at: 1700000000,
          },
        },
      },
    });

    const res1 = await postWebhook(ctx.app, rawBody);
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body).received).toBe(true);

    const updated = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updated?.status).toBe('SUCCEEDED');
    expect(updated?.gatewayPaymentId).toBe('pay_rzp_captured_999');
    expect(updated?.gatewayCapturedAt).toBeDefined();
    expect(new Date(updated!.gatewayCapturedAt!).toISOString()).toBe(
      new Date(1700000050 * 1000).toISOString()
    );

    const updatedOrder = ctx.orders.find((o) => o.orderId === order.orderId);
    expect(updatedOrder?.paidAmountMinor).toBe(1000);
    expect(updatedOrder?.paymentStatus).toBe('PAID');

    const res2 = await postWebhook(ctx.app, rawBody);
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body).duplicate).toBe(true);
  });

  it('does not mark payment as succeeded if status is not captured', async () => {
    const { ctx, payment } = await setupFixture();
    const rawBody = JSON.stringify({
      id: 'evt_rzp_wh_auth_only',
      event: 'payment.captured',
      created_at: 1700000050,
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_auth',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'authorized',
          },
        },
      },
    });

    const res = await postWebhook(ctx.app, rawBody);
    expect(res.statusCode).toBe(200);
    const p = ctx.payments.find((item) => item.paymentId === payment.paymentId);
    expect(p?.status).toBe('CREATED');
  });

  it('leaves gatewayCapturedAt undefined if event.created_at is missing from webhook', async () => {
    const { ctx, payment } = await setupFixture();
    const rawBody = JSON.stringify({
      id: 'evt_no_created_at',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_no_ts',
            order_id: payment.gatewayOrderId,
            amount: 1000,
            status: 'captured',
          },
        },
      },
    });

    const res = await postWebhook(ctx.app, rawBody);
    expect(res.statusCode).toBe(200);
    const p = ctx.payments.find((item) => item.paymentId === payment.paymentId);
    expect(p?.status).toBe('SUCCEEDED');
    expect(p?.gatewayCapturedAt).toBeUndefined();
  });

  it('processes payment.failed webhook', async () => {
    const { ctx, payment } = await setupFixture();
    const rawBody = JSON.stringify({
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
    });

    const res = await postWebhook(ctx.app, rawBody);
    expect(res.statusCode).toBe(200);
    const updated = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updated?.status).toBe('FAILED');
  });

  it('allows retry when webhook previously failed', async () => {
    const { ctx, payment, order } = await setupFixture();
    const eventId = 'evt_retry_test_123';
    ctx.webhookEvents.push({
      eventId,
      eventType: 'payment.captured',
      payload: {},
      status: 'FAILED',
      receivedAt: new Date(),
      error: 'Previous transient failure',
    });

    const rawBody = JSON.stringify({
      id: eventId,
      event: 'payment.captured',
      created_at: 1700000080,
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
    });

    const res = await postWebhook(ctx.app, rawBody);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).received).toBe(true);
    const updated = ctx.payments.find((p) => p.paymentId === payment.paymentId);
    expect(updated?.status).toBe('SUCCEEDED');
    const updatedOrder = ctx.orders.find((o) => o.orderId === order.orderId);
    expect(updatedOrder?.paidAmountMinor).toBe(1000);
  });
});
