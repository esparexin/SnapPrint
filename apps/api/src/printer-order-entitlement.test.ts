import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { createPrintJobs } from './repositories/print-job.repository.js';
import { upsertStudioSubscription } from './repositories/subscription.repository.js';

describe('Print Job Entitlement Boundaries Post-Expiry (apps/api)', () => {
  async function seedFixture() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_entitlement_owner';
    const studioId = 'studio_entitlement_test';

    ctx.users.push({
      id: userId,
      email: 'ent_owner@example.com',
      name: 'Entitlement Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'ent-prints',
      name: 'Ent Prints',
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
      payload: { email: 'ent_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;
    const cookies = { [cookie.name]: cookie.value };

    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_bw_1',
      studioId,
      name: 'HP LaserJet Pro',
      driverName: 'HP LaserJet Driver',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const p1Res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const devRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: p1Res.json().code,
        hostname: 'AGENT-ENT',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    const dev = devRes.json();

    return { ctx, studioId, dev };
  }

  it('honors post-expiry entitlement for orders paid before expiry but rejects orders paid after expiry', async () => {
    const { ctx, studioId, dev } = await seedFixture();

    const expiryTime = new Date('2026-11-20T12:00:00.000Z');
    await upsertStudioSubscription(ctx.db, {
      studioId,
      plan: 'free',
      status: 'expired',
      startsAt: new Date('2026-10-20T12:00:00.000Z').toISOString(),
      expiresAt: expiryTime.toISOString(),
      updatedAt: expiryTime.toISOString(),
    });

    await ctx.storage.put(
      'store_key_doc_legit',
      Buffer.from('PDF_CONTENT_LEGIT'),
      'application/pdf'
    );
    await ctx.db.collection('photo_assets').insertOne({
      assetId: 'ast_legit_12345678',
      studioId,
      sessionId: 'sess_entitled_12345678',
      storageKey: 'store_key_doc_legit',
      originalFilename: 'legit.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 100,
      pageCount: 1,
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
    });

    const seedOrder = async (
      orderId: string,
      orderNumber: string,
      sessionId: string,
      paidAt: Date
    ) => {
      await ctx.db.collection('orders').insertOne({
        orderId,
        studioId,
        orderNumber,
        sessionId,
        idempotencyKey: `idemp_${orderId}`,
        customerName: 'Kumar',
        customerPhone: '9876543210',
        items: [],
        totalSheets: 1,
        currency: 'INR',
        paymentStatus: 'PAID',
        status: 'submitted',
        totalAmountMinor: 1000,
        paidAmountMinor: 1000,
        createdAt: paidAt,
        updatedAt: paidAt,
      });
      await ctx.db.collection('payments').insertOne({
        paymentId: `pay_${orderId}`,
        orderId,
        studioId,
        status: 'SUCCEEDED',
        method: 'razorpay',
        amountMinor: 1000,
        currency: 'INR',
        gatewayCapturedAt: paidAt.toISOString(),
        createdAt: paidAt,
        updatedAt: paidAt,
      });
    };

    // Order 1: Paid BEFORE expiry (paymentCapturedAt <= subscriptionExpiresAt)
    const paidBeforeExpiry = new Date('2026-11-20T11:00:00.000Z');
    await seedOrder(
      'ord_entitled_12345678',
      'ORD-ENT-0001',
      'sess_entitled_12345678',
      paidBeforeExpiry
    );

    // Order 2: Paid AFTER expiry (paymentCapturedAt > subscriptionExpiresAt)
    const paidAfterExpiry = new Date('2026-11-20T13:00:00.000Z');
    await seedOrder(
      'ord_rejected_12345678',
      'ORD-REJ-0002',
      'sess_rejected_12345678',
      paidAfterExpiry
    );

    const makeJob = (jobId: string, orderId: string, filename: string, createdAt: string) => ({
      jobId,
      studioId,
      orderId,
      itemId: 'item_1',
      assetId: 'ast_legit_12345678',
      targetPrinterId: 'prn_bw_1',
      printerName: 'HP',
      colorMode: 'bw' as const,
      paperSize: 'A4' as const,
      sides: 'single' as const,
      copies: 1,
      filename,
      status: 'pending' as const,
      createdAt,
    });

    const jobs1 = await createPrintJobs(ctx.db, [
      makeJob('job_entitled_01', 'ord_entitled_12345678', 'legit.pdf', '2026-11-20T11:05:00.000Z'),
    ]);
    const jobs2 = await createPrintJobs(ctx.db, [
      makeJob(
        'job_rejected_02',
        'ord_rejected_12345678',
        'rejected.pdf',
        '2026-11-20T13:05:00.000Z'
      ),
    ]);

    // Agent polls pending jobs under expired subscription
    const pollRes = await ctx.app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(pollRes.statusCode).toBe(200);
    const dispatches = pollRes.json().jobs;
    // Only the entitled job is dispatched
    expect(dispatches.length).toBe(1);
    expect(dispatches[0].jobId).toBe(jobs1[0].jobId);

    // Streaming entitled job document succeeds
    const streamDocRes = await ctx.app.inject({
      method: 'GET',
      url: `/agent/jobs/${jobs1[0].jobId}/document`,
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(streamDocRes.statusCode).toBe(200);

    // Attempting to stream unentitled job document returns 403 SUBSCRIPTION_EXPIRED
    const streamRejectRes = await ctx.app.inject({
      method: 'GET',
      url: `/agent/jobs/${jobs2[0].jobId}/document`,
      headers: { 'x-device-token': dev.deviceToken },
    });
    expect(streamRejectRes.statusCode).toBe(403);
    expect(streamRejectRes.json().code).toBe('SUBSCRIPTION_EXPIRED');
  });
});
