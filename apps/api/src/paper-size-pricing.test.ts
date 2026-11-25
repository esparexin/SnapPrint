import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

describe('Paper-Size Aware Print Pricing & Quotation Integration', () => {
  async function seedTestContext() {
    const ctx = await createTestApp();
    const studioId = 'studio_koramangala';
    const slug = 'koramangala-print';
    const sessionId = 'sess_pricing_1234567890abcdef';
    const secret = 'test-session-secret-at-least-32-chars-long!';
    const expiresAt = new Date(Date.now() + 7200000).toISOString();
    const now = new Date();

    ctx.studios.push({
      id: studioId,
      slug,
      name: 'Koramangala Print Hub',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: 'pay_at_counter',
        printRates: {
          A4: {
            black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
            color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
          },
          A3: {
            black_and_white: { singleSidedMinor: 500, doubleSidedMinor: 800 },
            color: { singleSidedMinor: 2000, doubleSidedMinor: 3500 },
          },
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    ctx.qrSessions.push({
      sessionId,
      studioId,
      status: 'active',
      createdAt: now,
      expiresAt: new Date(expiresAt),
    });

    await ctx.db.collection('subscriptions').insertOne({
      studioId,
      plan: 'quarterly',
      status: 'active',
      startsAt: now,
      expiresAt: new Date(Date.now() + 86400000 * 90),
      updatedAt: now,
    });
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_pricing_test',
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
      id: 'prn_pricing_test',
      studioId,
      name: 'HP',
      role: 'active_bw',
      isColorSupported: true,
      supportedPaperSizes: ['A4', 'A3'],
      duplexSupport: 'supported',
      supportedDuplexSizes: ['A4', 'A3'],
      capabilityProvenance: 'driver_query',
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const token = signSessionToken({ sessionId, studioId, expiresAt }, secret);
    return { ctx, studioId, slug, sessionId, token };
  }

  it('calculates canonical odd-page duplex quotation across multiple paper sizes', async () => {
    const { ctx, studioId, slug, sessionId, token } = await seedTestContext();
    const docId = 'asset_pricing_dissertation_123';

    await ctx.db.collection('photo_assets').insertOne({
      assetId: docId,
      studioId,
      sessionId,
      originalFilename: 'dissertation.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 2048,
      pageCount: 3,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${docId}/dissertation.pdf`,
      createdAt: new Date(),
    });

    // 1. A4 B&W 3-page duplex: 1 sheet (300) + 1 single-sided page (200) = 500 paise
    const resA4 = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        items: [
          {
            assetId: docId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'double_sided',
            copies: 1,
          },
        ],
      },
    });
    expect(resA4.statusCode).toBe(200);
    const quoteA4 = JSON.parse(resA4.payload);
    expect(quoteA4.items[0].sheetsCount).toBe(2);
    expect(quoteA4.items[0].subtotalMinor).toBe(500);

    // 2. A3 Color 3-page duplex: 1 sheet (3500) + 1 single-sided page (2000) = 5500 paise
    const resA3 = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/quote`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        items: [
          {
            assetId: docId,
            paperSize: 'A3',
            colorMode: 'color',
            sides: 'double_sided',
            copies: 1,
          },
        ],
      },
    });
    expect(resA3.statusCode).toBe(200);
    const quoteA3 = JSON.parse(resA3.payload);
    expect(quoteA3.items[0].sheetsCount).toBe(2);
    expect(quoteA3.items[0].subtotalMinor).toBe(5500);
  });

  it('preserves immutable price snapshots when shop rates change after order submission', async () => {
    const { ctx, studioId, slug, sessionId, token } = await seedTestContext();
    const docId = 'asset_pricing_snapshot_123';

    await ctx.db.collection('photo_assets').insertOne({
      assetId: docId,
      studioId,
      sessionId,
      originalFilename: 'notes.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      pageCount: 3,
      storageKey: `studios/${studioId}/sessions/${sessionId}/${docId}/notes.pdf`,
      createdAt: new Date(),
    });

    const orderRes = await ctx.app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        idempotencyKey: 'idem_pricing_snapshot_test',
        customerName: 'Ananya Rao',
        customerPhone: '9876543210',
        items: [
          {
            assetId: docId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'double_sided',
            copies: 1,
          },
        ],
      },
    });
    expect(orderRes.statusCode).toBe(201);
    const order = JSON.parse(orderRes.payload);
    expect(order.totalAmountMinor).toBe(500); // 300 + 200

    // Later, the shop owner increases rates drastically
    ctx.studios[0].settings.printRates = {
      A4: {
        black_and_white: { singleSidedMinor: 5000, doubleSidedMinor: 9000 },
        color: { singleSidedMinor: 10000, doubleSidedMinor: 18000 },
      },
    };

    // The historical order snapshot must remain unchanged
    const fetchOrderRes = await ctx.app.inject({
      method: 'GET',
      url: `/public/studios/${slug}/sessions/${sessionId}/orders/${order.orderId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(fetchOrderRes.statusCode).toBe(200);
    const fetchedOrder = JSON.parse(fetchOrderRes.payload);
    expect(fetchedOrder.totalAmountMinor).toBe(500);
    expect(fetchedOrder.items[0].subtotalMinor).toBe(500);
  });
});
