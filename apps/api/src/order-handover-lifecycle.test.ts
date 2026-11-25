import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Order Handover Verification & Post-Handover Document Deletion Lifecycle', () => {
  const makeItem = (assetId: string, filename: string) => ({
    assetId,
    filename,
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
  });

  async function seedTestEnvironment() {
    const ctx = await createTestApp();
    const studioId = 'studio_mg_road';
    const passwordHash = await hashPassword('Password123!');

    ctx.studios.push({
      id: studioId,
      slug: 'mg-road-print',
      name: 'MG Road Print Hub',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false, paymentPolicy: 'pay_at_counter' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ctx.users.push({
      id: 'usr_operator_1',
      email: 'operator@print.com',
      name: 'Operator Ananya',
      passwordHash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ctx.memberships.push({
      userId: 'usr_operator_1',
      studioId,
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'operator@print.com', password: 'Password123!' },
    });
    return { ctx, studioId, cookie: loginRes.cookies[0]! };
  }

  it('keeps documents strictly grouped by order and allows preview before and after printing', async () => {
    const { ctx, studioId, cookie } = await seedTestEnvironment();
    const sessA = 'sess_customer_a_123456';
    const sessB = 'sess_customer_b_789012';
    const assetA1 = 'asset_doc_a1_1234567890';
    const assetB1 = 'asset_doc_b1_9876543210';
    const keyA1 = `studios/${studioId}/sessions/${sessA}/${assetA1}/syllabus.pdf`;
    const keyB1 = `studios/${studioId}/sessions/${sessB}/${assetB1}/notes.pdf`;

    await ctx.storage.put(keyA1, new TextEncoder().encode('%PDF-1.4 Syllabus A'), 'application/pdf');
    await ctx.storage.put(keyB1, new TextEncoder().encode('%PDF-1.4 Notes B'), 'application/pdf');

    ctx.photoAssets.push(
      { assetId: assetA1, studioId, sessionId: sessA, originalFilename: 'syllabus.pdf', mimeType: 'application/pdf', fileSizeBytes: 50, pageCount: 3, storageKey: keyA1, createdAt: new Date() },
      { assetId: assetB1, studioId, sessionId: sessB, originalFilename: 'notes.pdf', mimeType: 'application/pdf', fileSizeBytes: 50, pageCount: 3, storageKey: keyB1, createdAt: new Date() }
    );
    ctx.orders.push(
      { orderId: 'ord_cust_a_12345678', orderNumber: 'ORD-101', studioId, sessionId: sessA, idempotencyKey: 'idem_a1', items: [makeItem(assetA1, 'syllabus.pdf')], totalSheets: 3, totalAmountMinor: 600, currency: 'INR', status: 'ready', paymentStatus: 'PAID', createdAt: new Date(), updatedAt: new Date() },
      { orderId: 'ord_cust_b_87654321', orderNumber: 'ORD-102', studioId, sessionId: sessB, idempotencyKey: 'idem_b1', items: [makeItem(assetB1, 'notes.pdf')], totalSheets: 3, totalAmountMinor: 600, currency: 'INR', status: 'ready', paymentStatus: 'PAID', createdAt: new Date(), updatedAt: new Date() }
    );

    // Operator previews Order A document
    const resA = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders/ord_cust_a_12345678/documents/${assetA1}/download`,
      cookies: { [cookie.name]: cookie.value },
    });
    expect(resA.statusCode).toBe(200);
    expect(resA.headers['content-disposition']).toContain('syllabus.pdf');
    expect(resA.body).toContain('%PDF-1.4 Syllabus A');

    // Attempting to access Order B's document via Order A returns 404 ASSET_NOT_FOUND
    const resMismatch = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders/ord_cust_a_12345678/documents/${assetB1}/download`,
      cookies: { [cookie.name]: cookie.value },
    });
    expect(resMismatch.statusCode).toBe(404);
    expect(JSON.parse(resMismatch.payload).code).toBe('ASSET_NOT_FOUND');
  });

  it('mandates physical verification checkpoint before handover completion', async () => {
    const { ctx, studioId, cookie } = await seedTestEnvironment();
    const assetId = 'asset_handover_test123';
    ctx.orders.push({
      orderId: 'ord_handover_check12',
      orderNumber: 'ORD-103',
      studioId,
      sessionId: 'sess_handover_123456',
      idempotencyKey: 'idem_handover_1',
      items: [makeItem(assetId, 'contract.pdf')],
      totalSheets: 3,
      totalAmountMinor: 600,
      currency: 'INR',
      status: 'ready',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const patchStatus = (payload: { status: string; confirmedHandover?: boolean }) =>
      ctx.app.inject({
        method: 'PATCH',
        url: `/studios/${studioId}/orders/ord_handover_check12/status`,
        cookies: { [cookie.name]: cookie.value },
        payload,
      });

    // 1. Without confirmedHandover flag, completion is blocked
    const unconfirmed = await patchStatus({ status: 'completed' });
    expect(unconfirmed.statusCode).toBe(400);
    expect(JSON.parse(unconfirmed.payload).code).toBe('HANDOVER_NOT_CONFIRMED');

    // 2. With confirmedHandover: false, completion is blocked
    const explicitFalse = await patchStatus({ status: 'completed', confirmedHandover: false });
    expect(explicitFalse.statusCode).toBe(400);
    expect(JSON.parse(explicitFalse.payload).code).toBe('HANDOVER_NOT_CONFIRMED');

    // 3. With confirmedHandover: true, completion succeeds
    const confirmed = await patchStatus({ status: 'completed', confirmedHandover: true });
    expect(confirmed.statusCode).toBe(200);
    const body = JSON.parse(confirmed.payload);
    expect(body.status).toBe('completed');
    expect(body.events.some((e: { action?: string }) => e.action === 'handover_confirmed')).toBe(true);
  });

  it('gates document deletion until after handover, and serves 410 on deleted preview', async () => {
    const { ctx, studioId, cookie } = await seedTestEnvironment();
    const sessId = 'sess_delete_lifecycle';
    const assetId = 'asset_delete_test1234';
    const key = `studios/${studioId}/sessions/${sessId}/${assetId}/invoice.pdf`;

    await ctx.storage.put(key, new TextEncoder().encode('%PDF-1.4 Invoice Data'), 'application/pdf');
    ctx.photoAssets.push({
      assetId,
      studioId,
      sessionId: sessId,
      originalFilename: 'invoice.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 60,
      pageCount: 3,
      storageKey: key,
      createdAt: new Date(),
    });
    ctx.orders.push({
      orderId: 'ord_delete_check_123',
      orderNumber: 'ORD-104',
      studioId,
      sessionId: sessId,
      idempotencyKey: 'idem_del_1',
      items: [makeItem(assetId, 'invoice.pdf')],
      totalSheets: 3,
      totalAmountMinor: 600,
      currency: 'INR',
      status: 'ready',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const deleteDoc = () =>
      ctx.app.inject({
        method: 'DELETE',
        url: `/studios/${studioId}/orders/ord_delete_check_123/documents/${assetId}`,
        cookies: { [cookie.name]: cookie.value },
      });

    // 1. Deleting while order is 'ready' is blocked
    const earlyDel = await deleteDoc();
    expect(earlyDel.statusCode).toBe(400);
    expect(JSON.parse(earlyDel.payload).code).toBe('ORDER_NOT_COMPLETED');

    // 2. Complete handover
    await ctx.app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/orders/ord_delete_check_123/status`,
      cookies: { [cookie.name]: cookie.value },
      payload: { status: 'completed', confirmedHandover: true },
    });

    // 3. Deleting after completion succeeds and purges binary
    const successDel = await deleteDoc();
    expect(successDel.statusCode).toBe(200);
    const delRes = JSON.parse(successDel.payload);
    expect(delRes.success).toBe(true);
    expect(delRes.assetId).toBe(assetId);

    // Verify binary is purged from storage
    const storedBinary = await ctx.storage.get(key);
    expect(storedBinary).toBeNull();

    // 4. Repeated deletion returns DOCUMENT_ALREADY_DELETED
    const duplicateDel = await deleteDoc();
    expect(duplicateDel.statusCode).toBe(400);
    expect(JSON.parse(duplicateDel.payload).code).toBe('DOCUMENT_ALREADY_DELETED');

    // 5. Subsequent preview/download returns 410 DOCUMENT_DELETED
    const previewRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders/ord_delete_check_123/documents/${assetId}/download`,
      cookies: { [cookie.name]: cookie.value },
    });
    expect(previewRes.statusCode).toBe(410);
    const previewBody = JSON.parse(previewRes.payload);
    expect(previewBody.code).toBe('DOCUMENT_DELETED');
    expect(previewBody.message).toBe('Preview unavailable — document deleted');

    // 6. Order queue query still preserves metadata and audit trail
    const listRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/orders?status=completed`,
      cookies: { [cookie.name]: cookie.value },
    });
    expect(listRes.statusCode).toBe(200);
    const ordersList = JSON.parse(listRes.payload).orders;
    const completedOrder = ordersList.find((o: { orderId: string }) => o.orderId === 'ord_delete_check_123');
    expect(completedOrder).toBeDefined();
    expect(completedOrder.orderNumber).toBe('ORD-104');
    expect(completedOrder.items[0].isDeleted).toBe(true);
    expect(completedOrder.items[0].deletedAt).toBeDefined();
    expect(completedOrder.events.some((e: { action?: string }) => e.action === 'document_purged')).toBe(true);
  });
});
