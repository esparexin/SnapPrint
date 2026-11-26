import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { OrderAuditEvent } from '@snapprint/contracts';
import { createTestApp } from './auth-test-helper.js';

describe('Operator Print Job Retry Route', () => {
  const studioId = 'studio_retry_test';
  const orderId = 'ord_retry_1234567890';

  async function seedTestEnv(policy: 'pay_at_counter' | 'payment_required' = 'pay_at_counter') {
    const ctx = await createTestApp();
    const passwordHash = await hashPassword('Password123!');

    ctx.studios.push({
      id: studioId,
      slug: 'retry-test-studio',
      name: 'Retry Test Studio',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        paymentPolicy: policy,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.users.push({
      id: 'usr_op_1',
      email: 'op@studio.com',
      name: 'Operator Raju',
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId: 'usr_op_1',
      studioId,
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'op@studio.com', password: 'Password123!' },
    });
    const cookie = loginRes.headers['set-cookie'] as string;

    return { ctx, cookie };
  }

  it('resets failed print jobs and adds audit event on successful retry', async () => {
    const { ctx, cookie } = await seedTestEnv('pay_at_counter');
    const now = new Date();

    ctx.orders.push({
      orderId,
      orderNumber: 'ORD-901',
      studioId,
      sessionId: 'sess_1234567890123',
      idempotencyKey: 'idem_901123',
      items: [],
      totalSheets: 5,
      totalAmountMinor: 4000,
      currency: 'INR',
      status: 'processing',
      paymentStatus: 'PAID',
      paidAmountMinor: 4000,
      events: [],
      createdAt: now,
      updatedAt: now,
    });

    // Add a failed print job
    await ctx.db.collection('print_jobs').insertOne({
      jobId: 'job_fail_1',
      studioId,
      orderId,
      itemId: 'itm_1',
      assetId: 'ast_1',
      targetPrinterId: 'prn_laser',
      printerName: 'Shop Laser',
      colorMode: 'bw',
      paperSize: 'A4',
      sides: 'single',
      copies: 1,
      filename: 'doc.pdf',
      status: 'failed',
      errorMessage: 'Paper jam error',
      claimedByDeviceId: 'dev_hardware_1',
      createdAt: now,
      updatedAt: now,
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/orders/${orderId}/retry-print`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.orderId).toBe(orderId);
    expect(body.resetCount).toBe(1);

    // Verify job in DB is pending
    const job = await ctx.db.collection('print_jobs').findOne({ jobId: 'job_fail_1' });
    expect(job?.status).toBe('pending');
    expect(job?.errorMessage).toBeUndefined();

    // Verify order audit event
    const orderDoc = ctx.orders.find((o) => o.orderId === orderId);
    expect(orderDoc?.events).toHaveLength(1);
    expect((orderDoc?.events?.[0] as OrderAuditEvent)?.action).toBe('print_retry');
  });

  it('returns 400 when attempting to retry a cancelled or completed order', async () => {
    const { ctx, cookie } = await seedTestEnv('pay_at_counter');
    const now = new Date();

    ctx.orders.push({
      orderId: 'ord_cancelled_1',
      orderNumber: 'ORD-902',
      studioId,
      sessionId: 'sess_1234567890124',
      idempotencyKey: 'idem_902124',
      items: [],
      totalSheets: 5,
      totalAmountMinor: 4000,
      currency: 'INR',
      status: 'cancelled',
      paymentStatus: 'REFUNDED',
      paidAmountMinor: 0,
      events: [],
      createdAt: now,
      updatedAt: now,
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/orders/ord_cancelled_1/retry-print`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('INVALID_ORDER_STATE');
  });

  it('returns 404 when order is not found', async () => {
    const { ctx, cookie } = await seedTestEnv('pay_at_counter');
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/orders/ord_unknown_999/retry-print`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(404);
  });
});
