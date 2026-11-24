import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { autoDispatchOrderPrintJobs } from './repositories/printer.repository.js';

describe('Printer Job Routes (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_printers_job';
    const studioId = 'studio_printer_job_test';

    ctx.users.push({
      id: userId,
      email: 'printer_job_owner@example.com',
      name: 'Owner Ramesh',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'ramesh-job-prints',
      name: 'Ramesh Prints',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
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
      payload: { email: 'printer_job_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('manages print job lifecycle: auto-dispatches, fetches pending jobs, streams document, and reports completion', async () => {
    const { app, db, storage, studioId, cookie } = await seedStudioOwner();

    // 1. Generate pairing key & enroll agent
    const keyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    const { code } = keyRes.json();

    const enrollRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        agentVersion: '1.0.0',
        hostname: 'PRINT-STATION-01',
        osPlatform: 'win32',
      },
    });
    const { deviceToken } = enrollRes.json();

    // 2. Sync printers (HP LaserJet B&W + Epson L3150 Color)
    const now = new Date().toISOString();
    await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': deviceToken },
      payload: {
        printers: [
          {
            printerId: 'prn_hp_bw',
            name: 'HP LaserJet Pro M126nw',
            driverName: 'HP LaserJet Pro MFP',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            isDefaultOsPrinter: true,
            lastSeenAt: now,
          },
          {
            printerId: 'prn_epson_color',
            name: 'Epson L3150 Series',
            driverName: 'EPSON L3150',
            isColorSupported: true,
            supportedPaperSizes: ['A4'],
            status: 'online',
            isDefaultOsPrinter: false,
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });

    // 3. Assign roles
    await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_hp_bw/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_bw' },
    });
    await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_epson_color/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_color' },
    });

    // 4. Seed an asset into storage and photo_assets collection
    const assetId = 'ast_test_invoice_pdf';
    const sessionId = 'sess_test_session_123456';
    const storageKey = `private/${studioId}/${sessionId}/${assetId}/invoice.pdf`;
    const fakePdfBytes = Buffer.from('%PDF-1.4 Mock PDF Content For SnapPrint Spooler Test');
    await storage.put(storageKey, fakePdfBytes, 'application/pdf');

    await db.collection('photo_assets').insertOne({
      assetId,
      studioId,
      sessionId,
      originalFilename: 'invoice.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: fakePdfBytes.length,
      storageKey,
      createdAt: new Date(),
    });

    // 5. Seed an order with 1 B&W item
    const orderId = 'ord_customer_12345';
    await db.collection('orders').insertOne({
      orderId,
      orderNumber: 'SNP-101',
      studioId,
      sessionId,
      idempotencyKey: 'idemp_test_12345',
      items: [
        {
          assetId,
          filename: 'invoice.pdf',
          paperSize: 'A4',
          colorMode: 'black_and_white',
          sides: 'single_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          copies: 2,
          pageSelection: 'all',
          documentPageCount: 3,
          selectedPagesCount: 3,
          sheetsCount: 3,
          unitPriceMinor: 200,
          subtotalMinor: 600,
        },
      ],
      totalSheets: 3,
      totalAmountMinor: 600,
      paidAmountMinor: 600,
      currency: 'INR',
      status: 'submitted',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Trigger auto-dispatch
    const dispatched = await autoDispatchOrderPrintJobs(db, studioId, orderId);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].targetPrinterId).toBe('prn_hp_bw');
    expect(dispatched[0].printerName).toBe('HP LaserJet Pro M126nw');
    expect(dispatched[0].copies).toBe(2);

    // 7. Agent fetches pending jobs
    const pendingRes = await app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': deviceToken },
    });
    expect(pendingRes.statusCode).toBe(200);
    const { jobs } = pendingRes.json();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].jobId).toBe(dispatched[0].jobId);
    expect(jobs[0].colorMode).toBe('bw');

    // 8. Agent downloads/streams document binary
    const docRes = await app.inject({
      method: 'GET',
      url: `/agent/jobs/${jobs[0].jobId}/document`,
      headers: { 'x-device-token': deviceToken },
    });
    expect(docRes.statusCode).toBe(200);
    expect(docRes.headers['content-type']).toBe('application/pdf');
    expect(docRes.body).toBe(fakePdfBytes.toString());

    // 9. Agent reports job status as completed
    const statusRes = await app.inject({
      method: 'POST',
      url: `/agent/jobs/${jobs[0].jobId}/status`,
      headers: { 'x-device-token': deviceToken },
      payload: { status: 'completed' },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().status).toBe('completed');

    // 10. Verify order transitioned to ready
    const updatedOrder = await db.collection('orders').findOne({ orderId });
    expect(updatedOrder?.status).toBe('ready');
  });
});
