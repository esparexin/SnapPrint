import type { Db } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { createTestApp, seedTestStudio } from './auth-test-helper.js';
import { createPrintJobs } from './repositories/print-job.repository.js';
import {
  isJobEntitledForFulfillment,
  upsertStudioSubscription,
} from './repositories/subscription.repository.js';

describe('Print Job Entitlement Boundaries Post-Expiry (apps/api)', () => {
  const baseJob = {
    itemId: 'i1',
    assetId: 'ast_legit_12345678',
    targetPrinterId: 'prn_bw_1',
    printerName: 'HP',
    colorMode: 'bw' as const,
    paperSize: 'A4' as const,
    sides: 'single' as const,
    copies: 1,
    filename: 'doc.pdf',
    status: 'pending' as const,
  };

  async function seedFixture() {
    const ctx = await createTestApp();
    const { studioId, cookies } = await seedTestStudio(ctx, 'studio_ent_test');
    const now = new Date();

    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_bw_1',
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

    const p1 = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const devRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: p1.json().code,
        hostname: 'AGT',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });

    await ctx.storage.put('store_key_doc_legit', Buffer.from('P'), 'application/pdf');
    await ctx.db.collection('photo_assets').insertOne({
      assetId: 'ast_legit_12345678',
      studioId,
      sessionId: 'sess_1234567890123456',
      storageKey: 'store_key_doc_legit',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 10,
      pageCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return { ctx, studioId, dev: devRes.json() };
  }

  const seed = (
    ctx: { db: Db },
    studioId: string,
    orderId: string,
    paid: boolean,
    capAt?: string,
    at = new Date()
  ) =>
    Promise.all([
      ctx.db.collection('orders').insertOne({
        studioId,
        orderId,
        orderNumber: 'ORD',
        sessionId: `sess_${orderId}`,
        idempotencyKey: `idemp_${orderId}`,
        customerName: 'C',
        customerPhone: '9',
        items: [],
        totalSheets: 1,
        currency: 'INR',
        paymentStatus: paid ? 'PAID' : 'UNPAID',
        status: 'submitted',
        totalAmountMinor: 1000,
        paidAmountMinor: paid ? 1000 : 0,
        createdAt: at,
        updatedAt: at,
      }),
      ctx.db.collection('payments').insertOne({
        studioId,
        orderId,
        paymentId: `p_${orderId}`,
        status: paid ? 'SUCCEEDED' : 'CREATED',
        method: 'razorpay',
        amountMinor: 1000,
        currency: 'INR',
        ...(capAt ? { gatewayCapturedAt: capAt } : {}),
        createdAt: at,
        updatedAt: at,
      }),
    ]);

  it('honors post-expiry entitlement for orders paid before expiry but rejects orders paid after expiry', async () => {
    const { ctx, studioId, dev } = await seedFixture();
    const expiry = new Date('2026-11-20T12:00:00.000Z');
    await upsertStudioSubscription(ctx.db, {
      studioId,
      plan: 'free',
      status: 'expired',
      startsAt: '2026-10-20T12:00:00.000Z',
      expiresAt: expiry.toISOString(),
      updatedAt: expiry.toISOString(),
    });

    await seed(
      ctx,
      studioId,
      'ord_entitled_12345678',
      true,
      '2026-11-20T11:00:00.000Z',
      new Date('2026-11-20T11:00:00.000Z')
    );
    await seed(
      ctx,
      studioId,
      'ord_rejected_12345678',
      true,
      '2026-11-20T13:00:00.000Z',
      new Date('2026-11-20T13:00:00.000Z')
    );

    const [j1, j2] = await Promise.all([
      createPrintJobs(ctx.db, [
        {
          ...baseJob,
          jobId: 'j1',
          studioId,
          orderId: 'ord_entitled_12345678',
          createdAt: '2026-11-20T11:05:00.000Z',
        },
      ]),
      createPrintJobs(ctx.db, [
        {
          ...baseJob,
          jobId: 'j2',
          studioId,
          orderId: 'ord_rejected_12345678',
          createdAt: '2026-11-20T13:05:00.000Z',
        },
      ]),
    ]);

    const pollRes = await ctx.app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(pollRes.statusCode).toBe(200);
    const jobs = pollRes.json().jobs;
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobId).toBe(j1[0].jobId);

    const s1 = await ctx.app.inject({
      method: 'GET',
      url: `/agent/jobs/${j1[0].jobId}/document`,
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(s1.statusCode).toBe(200);

    const s2 = await ctx.app.inject({
      method: 'GET',
      url: `/agent/jobs/${j2[0].jobId}/document`,
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(s2.statusCode).toBe(403);
    expect(s2.json().code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('evaluates post-expiry boundaries: created before vs captured after, delayed webhook, and uncaptured', async () => {
    const { ctx, studioId } = await seedFixture();
    const expiry = new Date('2026-11-20T12:00:00.000Z');
    const sub = await upsertStudioSubscription(ctx.db, {
      studioId,
      plan: 'free',
      status: 'expired',
      startsAt: '2026-10-20T12:00:00.000Z',
      expiresAt: expiry.toISOString(),
      updatedAt: expiry.toISOString(),
    });

    const testCases = [
      {
        id: 'ord_late_capture_12',
        paid: true,
        cap: '2026-11-20T12:05:00.000Z',
        at: '2026-11-20T11:00:00.000Z',
        exp: false,
      },
      {
        id: 'ord_late_webhook_12',
        paid: true,
        cap: '2026-11-20T11:55:00.000Z',
        at: '2026-11-20T11:55:00.000Z',
        exp: true,
      },
      {
        id: 'ord_uncaptured_1234',
        paid: false,
        cap: undefined,
        at: '2026-11-20T11:30:00.000Z',
        exp: false,
      },
      {
        id: 'ord_missing_ts_1234',
        paid: true,
        cap: undefined,
        at: '2026-11-20T11:30:00.000Z',
        exp: false,
      },
    ];

    for (const tc of testCases) {
      await seed(ctx, studioId, tc.id, tc.paid, tc.cap, new Date(tc.at));
      expect(await isJobEntitledForFulfillment(ctx.db, studioId, tc.id, sub)).toBe(tc.exp);
    }
  });
});
