import { describe, expect, it } from 'vitest';
import { PRINTERS_COLLECTION } from './repositories/printer.repository.js';
import { createTestApp } from './auth-test-helper.js';
import { signSessionToken } from './session-token.js';

describe('Storefront Duplex Gating & Compatibility Validation', () => {
  async function seedTestStorefront(duplexSupport: 'supported' | 'unsupported') {
    const ctx = await createTestApp();
    const studioId = `studio_${duplexSupport}_test`;
    const slug = `slug-${duplexSupport}-shop`;

    ctx.studios.push({
      id: studioId,
      slug,
      name: `${duplexSupport} Shop`,
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        isAcceptingOrders: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const sessionId = `sess_${duplexSupport}_12345678`;
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    ctx.qrSessions.push({
      sessionId,
      studioId,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
    });
    const token = signSessionToken(
      { sessionId, studioId, expiresAt },
      'test-session-secret-at-least-32-chars-long!'
    );
    const session = { sessionId, token };

    // Seed active printer
    await ctx.db.collection(PRINTERS_COLLECTION).insertOne({
      id: `prn_${duplexSupport}`,
      studioId,
      name: `Printer ${duplexSupport}`,
      driverName: 'Generic Driver',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      duplexSupport,
      supportedDuplexSizes: duplexSupport === 'supported' ? ['A4'] : [],
      capabilityProvenance: 'driver_query',
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed agent device so checkout availability passes
    await ctx.db.collection('agent_devices').insertOne({
      deviceId: 'dev_online_1',
      studioId,
      hostname: 'node-pc',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: 'tok_online',
      status: 'active',
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
    });

    // Seed subscription so checkout availability passes
    const now = new Date();
    await ctx.db.collection('subscriptions').insertOne({
      studioId,
      plan: 'quarterly',
      status: 'active',
      startsAt: now,
      expiresAt: new Date(Date.now() + 86400000 * 90),
      updatedAt: now,
    });

    // Seed a photo asset
    const assetId = 'ast_sample_doc_01';
    await ctx.db.collection('photo_assets').insertOne({
      assetId,
      studioId,
      sessionId,
      originalFilename: 'test-document.pdf',
      storageKey: 'mock_storage_key',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      pageCount: 4,
      status: 'confirmed',
      createdAt: new Date(),
    });

    return { ...ctx, studioId, slug, session, assetId };
  }

  it('exposes public duplex capabilities on /public/studios/:slug', async () => {
    const { app, slug } = await seedTestStorefront('supported');
    const res = await app.inject({
      method: 'GET',
      url: `/public/studios/${slug}`,
    });
    if (res.statusCode !== 200) console.log('QUOTE ALLOW ERR:', res.statusCode, res.json());
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.capabilities).toBeDefined();
    expect(body.capabilities.supportsDuplex).toBe(true);
    expect(body.capabilities.supportedDuplexSizes).toEqual(['A4']);
  });

  it('rejects duplex quote request on simplex-only studio with 422 NO_DUPLEX_SUPPORT', async () => {
    const { app, slug, session, assetId } = await seedTestStorefront('unsupported');
    const res = await app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${session.sessionId}/quote`,
      headers: { authorization: `Bearer ${session.token}` },
      payload: {
        items: [
          {
            assetId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'double_sided',
            copies: 1,
            pageSelection: 'all',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('NO_DUPLEX_SUPPORT');
  });

  it('allows duplex quote request on duplex-capable studio', async () => {
    const { app, slug, session, assetId } = await seedTestStorefront('supported');
    const res = await app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${session.sessionId}/quote`,
      headers: { authorization: `Bearer ${session.token}` },
      payload: {
        items: [
          {
            assetId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'double_sided',
            copies: 1,
            pageSelection: 'all',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().totalSheets).toBe(2); // 4 pages duplex = 2 sheets
  });

  it('rejects duplex order submission on simplex-only studio with 422 NO_DUPLEX_SUPPORT', async () => {
    const { app, slug, session, assetId } = await seedTestStorefront('unsupported');
    const res = await app.inject({
      method: 'POST',
      url: `/public/studios/${slug}/sessions/${session.sessionId}/orders`,
      headers: { authorization: `Bearer ${session.token}` },
      payload: {
        idempotencyKey: 'idemp_dup_order_fail_1',
        customerName: 'Anil Kumar',
        customerPhone: '9876543210',
        items: [
          {
            assetId,
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'double_sided',
            copies: 1,
            pageSelection: 'all',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe('NO_DUPLEX_SUPPORT');
  });
});
