import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

describe('End-to-End Razorpay Lifecycle & Persistence Audit', () => {
  it('correctly verifies, persists, retrieves credentials and completes customer online checkout', async () => {
    const ctx = await createTestApp();
    const now = new Date();
    const studio = {
      id: 'std_rzp_audit',
      slug: 'rzp-audit-shop',
      name: 'Razorpay Audit Shop',
      status: 'active' as const,
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'payment_required' as const,
        onlinePaymentEnabled: false,
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
      expiresAt: new Date(Date.now() + 86400000 * 30),
      updatedAt: now,
    });
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_audit_1',
      studioId: studio.id,
      hostname: 'POS-1',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: 'dvt_audit_1',
      status: 'active',
      lastHeartbeatAt: now,
      createdAt: now,
    });
    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_audit_bw',
      studioId: studio.id,
      name: 'HP LaserJet',
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
      id: 'usr_owner_audit',
      email: 'owner@audit.com',
      name: 'Audit Owner',
      status: 'active' as const,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    ctx.memberships.push({
      userId: 'usr_owner_audit',
      studioId: studio.id,
      role: 'studio_owner' as const,
      status: 'active' as const,
      createdAt: now,
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@audit.com', password: 'Password123!' },
    });
    const opCookie = loginRes.cookies[0];
    const authHeaders = { cookie: `${opCookie.name}=${opCookie.value}`, 'x-studio-id': studio.id };

    // 1. Operator runs Razorpay connection test / verify
    const verifyRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studio.id}/verify-razorpay`,
      headers: authHeaders,
      payload: {
        keyId: 'rzp_test_persisted123',
        keySecret: 'secret_test8888',
      },
    });
    expect(verifyRes.statusCode).toBe(200);
    expect(JSON.parse(verifyRes.body).isConfirmed).toBe(true);

    // 2. Operator saves payment settings in dashboard
    const saveProfileRes = await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studio.id}`,
      headers: authHeaders,
      payload: {
        payment: {
          enableCounterPayment: true,
          enableOnlinePayment: true,
          isRazorpayConfirmed: true,
          razorpayKeyId: 'rzp_test_persisted123',
        },
      },
    });
    expect(saveProfileRes.statusCode).toBe(200);

    const saveSettingsRes = await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studio.id}/settings`,
      headers: authHeaders,
      payload: {
        onlinePaymentEnabled: true,
        counterPaymentEnabled: true,
      },
    });
    expect(saveSettingsRes.statusCode).toBe(200);

    // 3. Retrieval audit: GET /studios/:studioId must return persisted credentials
    const getStudioRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studio.id}`,
      headers: authHeaders,
    });
    expect(getStudioRes.statusCode).toBe(200);
    const studioData = JSON.parse(getStudioRes.body).studio;
    expect(studioData.payment).toBeDefined();
    expect(studioData.payment.isRazorpayConfirmed).toBe(true);
    expect(studioData.payment.enableOnlinePayment).toBe(true);
    expect(studioData.payment.razorpayKeyId).toBe('rzp_test_persisted123');

    // 4. Storefront audit: GET /public/studios/:slug exposes sanitized payment capabilities
    const publicRes = await ctx.app.inject({
      method: 'GET',
      url: `/public/studios/${studio.slug}`,
    });
    expect(publicRes.statusCode).toBe(200);
    const pubData = JSON.parse(publicRes.body);
    expect(pubData.payment.isRazorpayConfirmed).toBe(true);
    expect(pubData.payment.enableOnlinePayment).toBe(true);
    expect(pubData.payment.enableCounterPayment).toBe(true);

    // 5. Customer creates order and initiates online payment
    const sessionToken = signSessionToken(
      {
        sessionId: 'sess_audit_cust_12345678',
        studioId: studio.id,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      'test-session-secret-at-least-32-chars-long!'
    );

    const order = {
      orderId: 'ord_audit_101_12345678',
      orderNumber: 'ORD-2026-9999',
      studioId: studio.id,
      sessionId: 'sess_audit_cust_12345678',
      idempotencyKey: 'idemp_audit_1',
      customerName: 'Priya Patel',
      customerPhone: '9123456780',
      items: [],
      totalSheets: 2,
      totalAmountMinor: 400,
      currency: 'INR' as const,
      status: 'submitted' as const,
      paidAmountMinor: 0,
      paymentStatus: 'UNPAID' as const,
      createdAt: now,
      updatedAt: now,
    };
    ctx.orders.push(order);

    const initRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/initiate`,
      headers: { 'x-session-token': sessionToken },
      payload: { orderId: order.orderId, method: 'razorpay' },
    });
    if (initRes.statusCode !== 200) {
      console.log('INIT 500:', initRes.statusCode, initRes.body);
    }
    expect(initRes.statusCode).toBe(200);
    const initData = JSON.parse(initRes.body);
    expect(initData.paymentId).toBeDefined();
    expect(initData.gatewayOrderId).toBeDefined();
    expect(initData.keyId).toBe('rzp_test_persisted123');

    // 6. Customer completes online payment verification
    const verifyPayRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${studio.slug}/orders/${order.orderId}/pay/verify`,
      headers: { 'x-session-token': sessionToken },
      payload: {
        paymentId: initData.paymentId,
        gatewayOrderId: initData.gatewayOrderId,
        gatewayPaymentId: 'pay_rzp_audit_mock_1',
        gatewaySignature: 'mock_valid_signature',
      },
    });
    expect(verifyPayRes.statusCode).toBe(200);
    expect(JSON.parse(verifyPayRes.body).status).toBe('SUCCEEDED');

    // 7. Verify order payment summary synced to PAID
    const orderInDb = ctx.orders.find((o) => o.orderId === order.orderId);
    expect(orderInDb?.paidAmountMinor).toBe(400);
    expect(orderInDb?.paymentStatus).toBe('PAID');
  });
});
