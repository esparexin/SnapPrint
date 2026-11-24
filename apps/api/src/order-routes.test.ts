import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

describe('Document Print Orders & Quotation Routes', () => {
  async function seedTestEnvironment() {
    const ctx = await createTestApp();
    const studioId = 'studio_koramangala';
    const slug = 'koramangala-xerox';
    const sessionId = 'sess_valid_1234567890abcdef';
    const assetId = 'asset_1234567890abcdef123';
    const secret = 'test-session-secret-at-least-32-chars-long!';
    const expiresAt = new Date(Date.now() + 7200000).toISOString();
    const passwordHash = await hashPassword('Password123!');

    ctx.studios.push({
      id: studioId,
      slug,
      name: 'Koramangala Xerox Center',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'pay_at_counter',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.qrSessions.push({
      sessionId,
      studioId,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
    });

    ctx.photoAssets.push({
      assetId,
      studioId,
      sessionId,
      originalFilename: 'syllabus.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024 * 1024,
      pageCount: 10,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${assetId}/syllabus.pdf`,
      createdAt: new Date(),
    });

    const now = new Date();
    await ctx.db.collection('subscriptions').insertOne({
      studioId,
      plan: 'quarterly',
      status: 'active',
      startsAt: now,
      expiresAt: new Date(Date.now() + 86400000 * 90),
      updatedAt: now,
    });
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_order_test',
      studioId,
      hostname: 'POS',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: 'dvt_1',
      status: 'active',
      lastHeartbeatAt: now,
      createdAt: now,
    });
    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_order_bw',
      studioId,
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

    const token = signSessionToken({ sessionId, studioId, expiresAt }, secret);

    // Operator with view_orders & manage_order_status
    ctx.users.push({
      id: 'usr_staff_12345678',
      email: 'staff@xerox.com',
      name: 'Staff Member',
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId: 'usr_staff_12345678',
      studioId,
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    return { ctx, studioId, slug, sessionId, assetId, token };
  }

  it('calculates server-authoritative quotation for PDF print job', async () => {
    const { ctx, slug, sessionId, assetId, token } = await seedTestEnvironment();

    const item = {
      assetId,
      paperSize: 'A4' as const,
      colorMode: 'black_and_white' as const,
      sides: 'single_sided' as const,
      orientation: 'portrait' as const,
      scaling: 'fit_to_page' as const,
      pageSelection: '1-5',
      copies: 2,
    };
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: { items: [item] },
    });

    expect(res.statusCode).toBe(200);
    const quote = JSON.parse(res.payload);
    expect(quote.items).toHaveLength(1);
    expect(quote.items[0].selectedPagesCount).toBe(5);
    expect(quote.items[0].sheetsCount).toBe(5);
    expect(quote.items[0].subtotalMinor).toBe(5 * 200 * 2); // 2000 paise = ₹20.00
    expect(quote.totalAmountMinor).toBe(2000);
  });

  it('submits a print order idempotently, preventing duplicate creation', async () => {
    const { ctx, slug, sessionId, assetId, token } = await seedTestEnvironment();
    const idempotencyKey = 'idem_checkout_req_99999';

    const item = {
      assetId,
      paperSize: 'A4' as const,
      colorMode: 'black_and_white' as const,
      sides: 'double_sided' as const,
      orientation: 'portrait' as const,
      scaling: 'fit_to_page' as const,
      pageSelection: 'all',
      copies: 1,
    };
    const orderPayload = {
      idempotencyKey,
      customerName: 'Kalyan Medaboina',
      customerPhone: '9988776655',
      items: [item],
    };

    // First submission: creates order
    const res1 = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { authorization: `Bearer ${token}` },
      payload: orderPayload,
    });

    expect(res1.statusCode).toBe(201);
    const order1 = JSON.parse(res1.payload);
    expect(order1.orderId).toBeDefined();
    expect(order1.status).toBe('submitted');
    expect(order1.items[0].sheetsCount).toBe(5);
    expect(order1.totalAmountMinor).toBe(5 * 300); // 1500 paise = ₹15.00
    expect(ctx.orders).toHaveLength(1);

    // Second submission with same idempotencyKey: returns existing order without creating duplicate
    const res2 = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { authorization: `Bearer ${token}` },
      payload: orderPayload,
    });

    expect(res2.statusCode).toBe(200);
    const order2 = JSON.parse(res2.payload);
    expect(order2.orderId).toBe(order1.orderId);
    expect(ctx.orders).toHaveLength(1);

    // Customer status lookup
    const statusRes = await ctx.app.inject({
      method: 'GET',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders/${order1.orderId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(JSON.parse(statusRes.payload).orderNumber).toBe(order1.orderNumber);
  });

  it('allows authorized operator to view queue and update status', async () => {
    const { ctx, studioId, sessionId } = await seedTestEnvironment();

    // Seed existing order in collection
    ctx.orders.push({
      orderId: 'ord_op_test_12345678',
      orderNumber: 'ORD-TEST1',
      studioId,
      sessionId,
      idempotencyKey: 'idem_op_123',
      items: [],
      totalSheets: 5,
      totalAmountMinor: 1500,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'staff@xerox.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;

    // GET /studios/:studioId/orders
    const listRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders`,
      cookies: { [cookie.name]: cookie.value },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    expect(listBody.orders).toHaveLength(1);
    expect(listBody.orders[0].orderNumber).toBe('ORD-TEST1');

    // PATCH status to processing
    const patchRes = await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/orders/ord_op_test_12345678/status`,
      cookies: { [cookie.name]: cookie.value },
      payload: { status: 'processing' },
    });

    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.payload).status).toBe('processing');
  });
});
