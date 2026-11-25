import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Operator Start Printing Auto-Dispatch Lifecycle', () => {
  const mockItem = {
    assetId: 'asset_dispatch_doc_123',
    filename: 'test-document.pdf',
    paperSize: 'A4' as const,
    colorMode: 'black_and_white' as const,
    sides: 'single_sided' as const,
    orientation: 'portrait' as const,
    scaling: 'fit_to_page' as const,
    pageSelection: 'all',
    copies: 1,
    documentPageCount: 3,
    selectedPagesCount: 3,
    sheetsCount: 3,
    unitPriceMinor: 200,
    subtotalMinor: 600,
  };

  async function seedTestEnvironment() {
    const ctx = await createTestApp();
    const studioId = 'studio_dispatch_test';
    const passwordHash = await hashPassword('Password123!');

    ctx.studios.push({
      id: studioId,
      slug: 'dispatch-xerox',
      name: 'Dispatch Xerox Studio',
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

    ctx.users.push({
      id: 'usr_staff_dispatch',
      email: 'staff@dispatch.com',
      name: 'Staff Member',
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId: 'usr_staff_dispatch',
      studioId,
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    const now = new Date();
    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_test_laser',
      studioId,
      name: 'HP LaserJet M126',
      driverName: 'HP LaserJet MFP',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      duplexSupport: 'supported',
      supportedDuplexSizes: ['A4'],
      capabilityProvenance: 'verified',
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'staff@dispatch.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ctx, studioId, cookie };
  }

  it('automatically dispatches print jobs into print_jobs collection when operator transitions order to processing', async () => {
    const { ctx, studioId, cookie } = await seedTestEnvironment();
    const orderId = 'ord_start_print_101';

    await ctx.db.collection('orders').insertOne({
      orderId,
      orderNumber: 'DSP-101',
      studioId,
      sessionId: 'sess_dispatch_123',
      idempotencyKey: 'idem_dsp_101',
      items: [mockItem],
      totalSheets: 3,
      totalAmountMinor: 600,
      currency: 'INR',
      status: 'submitted',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Verify 0 print jobs initially
    const beforeJobs = await ctx.db.collection('print_jobs').find({ orderId }).toArray();
    expect(beforeJobs).toHaveLength(0);

    // Operator clicks Start Printing -> PATCH status to processing
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/orders/${orderId}/status`,
      cookies: { [cookie.name]: cookie.value },
      payload: { status: 'processing', notes: 'Operator clicked Start Printing' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('processing');

    // Verify print job was created and queued in print_jobs collection
    const afterJobs = await ctx.db.collection('print_jobs').find({ orderId }).toArray();
    expect(afterJobs).toHaveLength(1);
    expect(afterJobs[0].targetPrinterId).toBe('prn_test_laser');
    expect(afterJobs[0].printerName).toBe('HP LaserJet M126');
    expect(afterJobs[0].status).toBe('pending');
    expect(afterJobs[0].assetId).toBe(mockItem.assetId);
  });

  it('is idempotent and does not create duplicate print jobs if already dispatched', async () => {
    const { ctx, studioId, cookie } = await seedTestEnvironment();
    const orderId = 'ord_start_print_102';

    await ctx.db.collection('orders').insertOne({
      orderId,
      orderNumber: 'DSP-102',
      studioId,
      sessionId: 'sess_dispatch_123',
      idempotencyKey: 'idem_dsp_102',
      items: [mockItem],
      totalSheets: 3,
      totalAmountMinor: 600,
      currency: 'INR',
      status: 'submitted',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // First transition
    await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/orders/${orderId}/status`,
      cookies: { [cookie.name]: cookie.value },
      payload: { status: 'processing' },
    });

    const jobsFirst = await ctx.db.collection('print_jobs').find({ orderId }).toArray();
    expect(jobsFirst).toHaveLength(1);

    // If order re-dispatched, it returns existing jobs without creating duplicates
    const { autoDispatchOrderPrintJobs } = await import('./repositories/printer.repository.js');
    const jobsSecond = await autoDispatchOrderPrintJobs(ctx.db, studioId, orderId);
    expect(jobsSecond).toHaveLength(1);
    expect(jobsSecond[0].jobId).toBe(jobsFirst[0].jobId);
  });
});
