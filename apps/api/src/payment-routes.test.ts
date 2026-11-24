import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Payment Routes & Authorization Policy', () => {
  const setupBaseFixture = async () => {
    const ctx = await createTestApp();
    const now = new Date();
    const studio = {
      id: 'studio_test_1',
      slug: 'quick-print',
      name: 'Quick Print',
      status: 'active' as const,
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'payment_required' as 'payment_required' | 'pay_at_counter',
        onlinePaymentEnabled: true,
        counterPaymentEnabled: true,
      },
      createdAt: now,
      updatedAt: now,
    };
    ctx.studios.push(studio);

    await ctx.db.collection('subscriptions').insertOne({
      studioId: studio.id,
      plan: 'quarterly',
      status: 'active',
      startsAt: now,
      expiresAt: new Date(Date.now() + 86400000 * 90),
      updatedAt: now,
    });
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_pay_agent',
      studioId: studio.id,
      hostname: 'POS',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: 'dvt_pay',
      status: 'active',
      lastHeartbeatAt: now,
      createdAt: now,
    });
    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_pay_bw',
      studioId: studio.id,
      name: 'HP',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const passwordHash = await hashPassword('Password123!');
    ctx.users.push({
      id: 'usr_staff_123',
      email: 'staff@example.com',
      name: 'Staff Member',
      status: 'active' as const,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    ctx.memberships.push({
      userId: 'usr_staff_123',
      studioId: studio.id,
      role: 'studio_staff' as const,
      status: 'active' as const,
      createdAt: now,
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'staff@example.com', password: 'Password123!' },
    });
    const opCookie = loginRes.cookies[0];

    const order = {
      orderId: 'ord_pay_test_12345678',
      orderNumber: 'ORD-2026-0001',
      studioId: studio.id,
      sessionId: 'sess_cust_12345678',
      idempotencyKey: 'idemp_key_12345',
      customerName: 'Aarav Sharma',
      customerPhone: '9876543210',
      items: [],
      totalSheets: 5,
      totalAmountMinor: 500,
      currency: 'INR' as const,
      status: 'submitted' as const,
      paidAmountMinor: 0,
      paymentStatus: 'UNPAID' as const,
      createdAt: now,
      updatedAt: now,
    };
    ctx.orders.push(order);

    const patchStatus = (status = 'processing') =>
      ctx.app.inject({
        method: 'PATCH',
        url: `/studios/${studio.id}/orders/${order.orderId}/status`,
        cookies: { [opCookie.name]: opCookie.value },
        headers: { 'x-studio-id': studio.id },
        payload: { status },
      });

    const payCounter = (
      amountMinor: number,
      method: 'counter_cash' | 'counter_upi',
      notes?: string
    ) =>
      ctx.app.inject({
        method: 'POST',
        url: `/studios/${studio.id}/orders/${order.orderId}/payments/counter`,
        cookies: { [opCookie.name]: opCookie.value },
        headers: { 'x-studio-id': studio.id },
        payload: { method, amountMinor, ...(notes ? { notes } : {}) },
      });

    return { ctx, studio, order, opCookie, patchStatus, payCounter };
  };

  it('customer initiates and verifies online payment successfully', async () => {
    const { ctx, studio, order } = await setupBaseFixture();

    const initRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/initiate`,
      headers: { 'x-session-token': order.sessionId },
      payload: { orderId: order.orderId, method: 'razorpay' },
    });

    expect(initRes.statusCode).toBe(200);
    const initData = JSON.parse(initRes.body);
    expect(initData.paymentId).toBeDefined();
    expect(initData.gatewayOrderId).toBeDefined();
    expect(initData.amountMinor).toBe(500);

    const verifyRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/verify`,
      headers: { 'x-session-token': order.sessionId },
      payload: {
        paymentId: initData.paymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewayPaymentId: 'pay_rzp_mock_succ_123',
        gatewaySignature: 'mock_valid_signature',
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    expect(JSON.parse(verifyRes.body).status).toBe('SUCCEEDED');

    const historyRes = await ctx.app.inject({
      method: 'GET',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/payments`,
      headers: { 'x-session-token': order.sessionId },
    });
    const history = JSON.parse(historyRes.body);
    expect(history.totalPaidMinor).toBe(500);
    expect(history.paymentStatus).toBe('PAID');
  });

  it('rejects online payment verification with invalid signature', async () => {
    const { ctx, studio, order } = await setupBaseFixture();

    const initRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/initiate`,
      headers: { 'x-session-token': order.sessionId },
      payload: { orderId: order.orderId, method: 'razorpay' },
    });
    const initData = JSON.parse(initRes.body);

    const verifyRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/verify`,
      payload: {
        paymentId: initData.paymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewayPaymentId: 'pay_rzp_fail_123',
        gatewaySignature: 'mock_invalid_sig',
      },
    });

    expect(verifyRes.statusCode).toBe(400);
    expect(JSON.parse(verifyRes.body).code).toBe('INVALID_PAYMENT_SIGNATURE');
  });

  it('operator records counter cash and UPI payments', async () => {
    const { payCounter } = await setupBaseFixture();

    const partRes = await payCounter(200, 'counter_cash', 'Part payment');
    expect(partRes.statusCode).toBe(200);
    const partData = JSON.parse(partRes.body);
    expect(partData.payment.status).toBe('SUCCEEDED');
    expect(partData.order.paidAmountMinor).toBe(200);
    expect(partData.order.paymentStatus).toBe('PARTIALLY_PAID');

    const remRes = await payCounter(300, 'counter_upi', 'Remaining counter UPI');
    expect(remRes.statusCode).toBe(200);
    const remData = JSON.parse(remRes.body);
    expect(remData.order.paidAmountMinor).toBe(500);
    expect(remData.order.paymentStatus).toBe('PAID');
  });

  it('enforces print authorization policy: rejects printing unpaid order under payment_required', async () => {
    const { patchStatus } = await setupBaseFixture();
    const printRes = await patchStatus('processing');
    expect(printRes.statusCode).toBe(403);
    expect(JSON.parse(printRes.body).code).toBe('PAYMENT_REQUIRED_BEFORE_PRINT');
  });

  it('allows print authorization when order is fully PAID', async () => {
    const { payCounter, patchStatus } = await setupBaseFixture();
    await payCounter(500, 'counter_cash');
    const printRes = await patchStatus('processing');
    expect(printRes.statusCode).toBe(200);
    expect(JSON.parse(printRes.body).status).toBe('processing');
  });

  it('allows print authorization when studio policy is pay_at_counter even if UNPAID', async () => {
    const { studio, patchStatus } = await setupBaseFixture();
    studio.settings.paymentPolicy = 'pay_at_counter';
    const printRes = await patchStatus('processing');
    expect(printRes.statusCode).toBe(200);
    expect(JSON.parse(printRes.body).status).toBe('processing');
  });
});
