import { describe, expect, it } from 'vitest';
import { sanitizeOrderDocument } from './repositories/order-sanitizer.js';
import { toOrderContract, OrderDocument } from './repositories/order.repository.js';

describe('Order Sanitizer & Contract Resilience', () => {
  it('safely parses and defaults legacy orders missing item breakdowns and payment status', () => {
    const legacyDoc: OrderDocument = {
      orderId: 'ord_1234567890123456',
      orderNumber: 'ORD-999',
      studioId: 'studio_test_123456',
      sessionId: 'session_1234567890123456',
      idempotencyKey: 'idemp_12345678',
      items: [
        {
          assetId: 'asset_1234567890123456',
          // missing filename, documentPageCount, sheetsCount, subtotalMinor, etc.
          copies: 2,
        },
      ],
      totalSheets: 2,
      totalAmountMinor: 400,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date('2026-11-20T10:00:00Z'),
      updatedAt: new Date('2026-11-20T10:00:00Z'),
    };

    const record = toOrderContract(legacyDoc);
    expect(record.orderId).toBe('ord_1234567890123456');
    expect(record.paymentStatus).toBe('UNPAID');
    expect(record.paidAmountMinor).toBe(0);
    expect(record.items).toHaveLength(1);
    expect(record.items[0].filename).toBe('document.pdf');
    expect(record.items[0].paperSize).toBe('A4');
    expect(record.items[0].copies).toBe(2);
    expect(record.items[0].sheetsCount).toBe(1);
  });

  it('safely handles malformed order fields with fallbacks', () => {
    const malformedDoc: OrderDocument = {
      orderId: 'short', // invalid min length (< 16)
      orderNumber: '',
      studioId: 'studio_fallback_123',
      sessionId: 'short',
      idempotencyKey: '',
      items: [],
      totalSheets: 0,
      totalAmountMinor: 0,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const record = sanitizeOrderDocument(malformedDoc);
    expect(record.orderId.length).toBeGreaterThanOrEqual(16);
    expect(record.orderNumber).toBe('ORD-000');
    expect(record.sessionId.length).toBeGreaterThanOrEqual(16);
    expect(record.idempotencyKey.length).toBeGreaterThanOrEqual(8);
  });
});
