import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';
import { upsertStudioSubscription } from './repositories/subscription.repository.js';

describe('Storefront Hardware & Subscription Outage Gating (apps/api)', () => {
  async function seedStudioFixture() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_gating_owner';
    const studioId = 'studio_gating_test';
    const slug = 'gating-prints';

    ctx.users.push({
      id: userId,
      email: 'gating_owner@example.com',
      name: 'Gating Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug,
      name: 'Gating Prints',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId,
      studioId,
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'gating_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;
    const cookies = { [cookie.name]: cookie.value };

    const sessionId = 'sess_customer_12345678';
    const sessionSecret = 'test-session-secret-at-least-32-chars-long!';
    const expiresAt = new Date(Date.now() + 7200000).toISOString();
    const customerToken = signSessionToken({ sessionId, studioId, expiresAt }, sessionSecret);

    ctx.qrSessions.push({
      sessionId,
      studioId,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7200000),
    });

    await ctx.db.collection('photo_assets').insertOne({
      assetId: 'ast_gating_12345678',
      studioId,
      sessionId,
      storageKey: 'key_gating_doc',
      originalFilename: 'test.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 100,
      pageCount: 1,
      createdAt: new Date(),
    });

    return { ctx, studioId, slug, sessionId, customerToken, cookies };
  }

  it('hard-blocks order submission on subscription expiry, offline agent, or missing printer', async () => {
    const { ctx, studioId, slug, sessionId, customerToken } = await seedStudioFixture();

    const orderPayload = {
      idempotencyKey: 'idemp_gate_001',
      customerName: 'Customer Rahul',
      customerPhone: '9876543210',
      items: [
        {
          assetId: 'ast_gating_12345678',
          copies: 1,
          colorMode: 'black_and_white',
          paperSize: 'A4',
          sides: 'single_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          pageSelection: 'all',
        },
      ],
    };

    // 1. Without subscription -> 403 SUBSCRIPTION_EXPIRED
    const subBlockRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { 'x-session-token': customerToken },
      payload: orderPayload,
    });
    expect(subBlockRes.statusCode).toBe(403);
    expect(subBlockRes.json().code).toBe('SUBSCRIPTION_EXPIRED');

    // Activate subscription
    await upsertStudioSubscription(ctx.db, {
      studioId,
      plan: 'quarterly',
      status: 'active',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Without online agent -> 403 AGENT_OFFLINE
    const agentBlockRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { 'x-session-token': customerToken },
      payload: orderPayload,
    });
    expect(agentBlockRes.statusCode).toBe(403);
    expect(agentBlockRes.json().code).toBe('AGENT_OFFLINE');

    // Enroll online agent
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_gating_agent',
      studioId,
      hostname: 'POS-01',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: 'dvt_gating_token',
      status: 'active',
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
    });

    // 3. Without active printer assigned -> 403 NO_ACTIVE_PRINTER
    const printerBlockRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { 'x-session-token': customerToken },
      payload: orderPayload,
    });
    expect(printerBlockRes.statusCode).toBe(403);
    expect(printerBlockRes.json().code).toBe('NO_ACTIVE_PRINTER');

    // Add active printer
    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_bw_active',
      studioId,
      name: 'HP LaserJet',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. With all systems operational -> 201 Created
    const successRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { 'x-session-token': customerToken },
      payload: orderPayload,
    });
    expect(successRes.statusCode).toBe(201);
    expect(successRes.json().orderId).toBeDefined();
  });

  it('hard-blocks online payment initiate and counter payment when infrastructure is offline or expired', async () => {
    const { ctx, studioId, slug, sessionId, customerToken, cookies } = await seedStudioFixture();

    const orderId = 'ord_pay_gate_12345678';
    await ctx.db.collection('orders').insertOne({
      orderId,
      orderNumber: 'ORD-PG-001',
      studioId,
      sessionId,
      idempotencyKey: 'idemp_pg_1',
      customerName: 'Customer Priya',
      customerPhone: '9876543210',
      items: [],
      totalSheets: 1,
      totalAmountMinor: 1000,
      paidAmountMinor: 0,
      paymentStatus: 'UNPAID',
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Payment initiate blocked without subscription
    const payBlockRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/orders/${orderId}/pay/initiate`,
      headers: { 'x-session-token': customerToken },
      payload: { amountMinor: 1000 },
    });
    expect(payBlockRes.statusCode).toBe(403);
    expect(payBlockRes.json().code).toBe('SUBSCRIPTION_EXPIRED');

    // Counter payment blocked without active subscription
    const counterBlockRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/orders/${orderId}/payments/counter`,
      cookies,
      payload: { amountMinor: 1000, method: 'counter_cash' },
    });
    expect(counterBlockRes.statusCode).toBe(403);
    expect(counterBlockRes.json().code).toBe('SUBSCRIPTION_EXPIRED');
  });
});
