import { describe, expect, it } from 'vitest';
import { createTestApp } from '../auth-test-helper.js';
import {
  createOrderRecord,
  findOrderBySessionAndId,
  findOrderByStudioAndIdempotency,
  listOrdersByStudio,
  updateOrderStatus,
} from './order.repository.js';

describe('Order Repository (MongoDB)', () => {
  it('creates an order and retrieves it idempotently and by session', async () => {
    const ctx = await createTestApp();
    const studioId = 'std_test_studio';
    const sessionId = 'sess_test_session_123';
    const orderId = 'ord_1234567890abcdef123';

    const order = await createOrderRecord(ctx.db, {
      orderId,
      orderNumber: 'ORD-1001',
      studioId,
      sessionId,
      idempotencyKey: 'idem_key_12345',
      customerName: 'Anil Kumar',
      customerPhone: '9876543210',
      items: [
        {
          assetId: 'asset_1234567890abcdef',
          filename: 'report.pdf',
          paperSize: 'A4',
          colorMode: 'black_and_white',
          sides: 'single_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          pageSelection: 'all',
          copies: 1,
          documentPageCount: 10,
          selectedPagesCount: 10,
          sheetsCount: 10,
          unitPriceMinor: 200,
          subtotalMinor: 2000,
        },
      ],
      totalSheets: 10,
      totalAmountMinor: 2000,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(order.orderId).toBe(orderId);
    expect(order.totalAmountMinor).toBe(2000);

    // Find by idempotency
    const foundIdem = await findOrderByStudioAndIdempotency(ctx.db, studioId, 'idem_key_12345');
    expect(foundIdem?.orderId).toBe(orderId);

    // Find by session and ID
    const foundSession = await findOrderBySessionAndId(ctx.db, studioId, sessionId, orderId);
    expect(foundSession?.orderId).toBe(orderId);

    // List by studio
    const orders = await listOrdersByStudio(ctx.db, studioId);
    expect(orders).toHaveLength(1);

    // Update status
    const updated = await updateOrderStatus(ctx.db, studioId, orderId, 'processing');
    expect(updated?.status).toBe('processing');
  });
});
