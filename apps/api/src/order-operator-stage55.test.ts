import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { OrderPaymentStatus, OrderStatus } from '@snapprint/contracts';
import { createTestApp } from './auth-test-helper.js';

describe('Stage 5.5 Operator Queue, Document Access & State Machine', () => {
  const mockItem = {
    assetId: 'asset_doc_1234567890abcdef',
    filename: 'syllabus.pdf',
    paperSize: 'A4' as const,
    colorMode: 'black_and_white' as const,
    sides: 'single_sided' as const,
    orientation: 'portrait' as const,
    scaling: 'fit_to_page' as const,
    pageSelection: 'all',
    copies: 1,
    documentPageCount: 5,
    selectedPagesCount: 5,
    sheetsCount: 5,
    unitPriceMinor: 200,
    subtotalMinor: 1000,
  };

  const makeOrder = (
    id: string,
    num: string,
    studioId: string,
    status: OrderStatus = 'submitted',
    paymentStatus: OrderPaymentStatus = 'UNPAID',
    items = [mockItem]
  ) => ({
    orderId: id,
    orderNumber: num,
    studioId,
    sessionId: 'sess_stage55_1234567890',
    idempotencyKey: `idem_${id.slice(-8)}`,
    items,
    totalSheets: items.length * 5,
    totalAmountMinor: items.length * 1000,
    currency: 'INR' as const,
    status,
    paymentStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  async function seedEnv(policy: 'pay_at_counter' | 'payment_required' = 'pay_at_counter') {
    const ctx = await createTestApp();
    const studioId = 'studio_koramangala';
    const sessionId = 'sess_stage55_1234567890';
    const assetId = mockItem.assetId;
    const storageKey = `studios/${studioId}/sessions/${sessionId}/${assetId}/syllabus.pdf`;
    const passwordHash = await hashPassword('Password123!');

    ctx.studios.push({
      id: studioId,
      slug: 'koramangala-xerox',
      name: 'Koramangala Xerox Center',
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

    const pdfBuffer = new TextEncoder().encode('%PDF-1.4 dummy pdf for test');
    await ctx.storage.put(storageKey, pdfBuffer, 'application/pdf');

    ctx.photoAssets.push({
      assetId,
      studioId,
      sessionId,
      originalFilename: 'syllabus.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: pdfBuffer.length,
      pageCount: 5,
      storageKey,
      createdAt: new Date(),
    });

    ctx.users.push({
      id: 'usr_staff_123',
      email: 'operator@xerox.com',
      name: 'Operator Ravi',
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId: 'usr_staff_123',
      studioId,
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    const loginOperator = async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'operator@xerox.com', password: 'Password123!' },
      });
      return res.cookies[0];
    };

    return { ctx, studioId, assetId, loginOperator };
  }

  it('allows authorized operator to download document with safe headers', async () => {
    const { ctx, studioId, assetId, loginOperator } = await seedEnv('pay_at_counter');
    ctx.orders.push(makeOrder('ord_doc_test_12345678', 'ORD-101', studioId, 'submitted', 'UNPAID'));

    const cookie = await loginOperator();
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders/ord_doc_test_12345678/documents/${assetId}/download`,
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['content-disposition']).toContain('syllabus.pdf');
    expect(res.body).toContain('%PDF-1.4');
  });

  it('blocks document download if unpaid and payment_required policy is active', async () => {
    const { ctx, studioId, assetId, loginOperator } = await seedEnv('payment_required');
    ctx.orders.push(makeOrder('ord_doc_unpaid_123456', 'ORD-102', studioId, 'submitted', 'UNPAID'));

    const cookie = await loginOperator();
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders/ord_doc_unpaid_123456/documents/${assetId}/download`,
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('PAYMENT_REQUIRED_BEFORE_PRINT');
  });

  it('enforces order lifecycle transitions and records audit events', async () => {
    const { ctx, studioId, loginOperator } = await seedEnv('pay_at_counter');
    ctx.orders.push(
      makeOrder('ord_lifecycle_123456', 'ORD-103', studioId, 'submitted', 'PAID', [])
    );

    const cookie = await loginOperator();
    const patch = (payload: { status: string; notes?: string }) =>
      ctx.app.inject({
        method: 'PATCH',
        url: `/studios/${studioId}/orders/ord_lifecycle_123456/status`,
        cookies: { [cookie.name]: cookie.value },
        payload,
      });

    // 1. Invalid jump submitted -> ready rejected
    const invalid = await patch({ status: 'ready' });
    expect(invalid.statusCode).toBe(400);
    expect(JSON.parse(invalid.payload).code).toBe('INVALID_STATUS_TRANSITION');

    // 2. submitted -> processing
    const step1 = await patch({ status: 'processing', notes: 'Paper loaded' });
    expect(step1.statusCode).toBe(200);
    const ord1 = JSON.parse(step1.payload);
    expect(ord1.status).toBe('processing');
    expect(ord1.events[0].fromStatus).toBe('submitted');
    expect(ord1.events[0].operatorName).toBe('Operator Ravi');

    // 3. processing -> ready
    const step2 = await patch({ status: 'ready' });
    expect(step2.statusCode).toBe(200);
    expect(JSON.parse(step2.payload).status).toBe('ready');

    // 4. ready -> completed
    const step3 = await patch({ status: 'completed', notes: 'Handed over' });
    expect(step3.statusCode).toBe(200);
    expect(JSON.parse(step3.payload).status).toBe('completed');

    // 5. Terminal state
    const step4 = await patch({ status: 'processing' });
    expect(step4.statusCode).toBe(400);
    expect(JSON.parse(step4.payload).code).toBe('ORDER_IN_TERMINAL_STATE');
  });

  it('filters queue by status parameter', async () => {
    const { ctx, studioId, loginOperator } = await seedEnv('pay_at_counter');
    ctx.orders.push(
      makeOrder('ord_filter_sub_12345', 'ORD-201', studioId, 'submitted', 'UNPAID', []),
      makeOrder('ord_filter_proc_1234', 'ORD-202', studioId, 'processing', 'UNPAID', [])
    );

    const cookie = await loginOperator();
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders?status=processing`,
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].orderNumber).toBe('ORD-202');
  });
});
