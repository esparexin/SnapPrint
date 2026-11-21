import { describe, expect, it } from 'vitest';
import {
  DocumentPrintConfigSchema,
  OrderRecordSchema,
  OrderSubmissionRequestSchema,
  QuoteRequestSchema,
  QuoteResponseSchema,
} from './document-print.js';

describe('Document Print & Xerox Contracts', () => {
  it('validates a correct document print configuration with defaults', () => {
    const valid = DocumentPrintConfigSchema.safeParse({
      assetId: 'asset_1234567890abcdef',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.paperSize).toBe('A4');
      expect(valid.data.colorMode).toBe('black_and_white');
      expect(valid.data.sides).toBe('single_sided');
      expect(valid.data.orientation).toBe('portrait');
      expect(valid.data.scaling).toBe('fit_to_page');
      expect(valid.data.pageSelection).toBe('all');
      expect(valid.data.copies).toBe(1);
    }
  });

  it('validates custom print options', () => {
    const valid = DocumentPrintConfigSchema.safeParse({
      assetId: 'asset_1234567890abcdef',
      paperSize: 'A3',
      colorMode: 'color',
      sides: 'double_sided',
      orientation: 'landscape',
      scaling: 'actual_size',
      pageSelection: '1-5, 8',
      copies: 5,
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid copies count or paper size', () => {
    const invalidCopies = DocumentPrintConfigSchema.safeParse({
      assetId: 'asset_1234567890abcdef',
      copies: 0,
    });
    expect(invalidCopies.success).toBe(false);

    const invalidPaper = DocumentPrintConfigSchema.safeParse({
      assetId: 'asset_1234567890abcdef',
      paperSize: 'unsupported_poster',
    });
    expect(invalidPaper.success).toBe(false);
  });

  it('validates quote request and response schemas', () => {
    const quoteReq = QuoteRequestSchema.safeParse({
      items: [{ assetId: 'asset_1234567890abcdef', copies: 2 }],
    });
    expect(quoteReq.success).toBe(true);

    const quoteRes = QuoteResponseSchema.safeParse({
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
          copies: 2,
          documentPageCount: 10,
          selectedPagesCount: 10,
          sheetsCount: 10,
          unitPriceMinor: 200,
          subtotalMinor: 4000,
        },
      ],
      totalSheets: 20,
      totalAmountMinor: 4000,
      currency: 'INR',
      calculatedAt: new Date().toISOString(),
    });
    expect(quoteRes.success).toBe(true);
  });

  it('validates order submission and persisted order schema', () => {
    const submission = OrderSubmissionRequestSchema.safeParse({
      idempotencyKey: 'idem_12345678',
      customerName: 'Ravi Teja',
      customerPhone: '9876543210',
      items: [{ assetId: 'asset_1234567890abcdef' }],
    });
    expect(submission.success).toBe(true);

    const orderRecord = OrderRecordSchema.safeParse({
      orderId: 'ord_1234567890abcdef123',
      orderNumber: 'ORD-1001',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef',
      idempotencyKey: 'idem_12345678',
      customerName: 'Ravi Teja',
      customerPhone: '9876543210',
      items: [
        {
          assetId: 'asset_1234567890abcdef',
          filename: 'notes.pdf',
          paperSize: 'A4',
          colorMode: 'black_and_white',
          sides: 'double_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          pageSelection: '1-4',
          copies: 1,
          documentPageCount: 4,
          selectedPagesCount: 4,
          sheetsCount: 2,
          unitPriceMinor: 300,
          subtotalMinor: 300,
        },
      ],
      totalSheets: 2,
      totalAmountMinor: 300,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(orderRecord.success).toBe(true);
    if (orderRecord.success) {
      expect(orderRecord.data.events).toEqual([]);
    }
  });

  it('validates order audit events and status update payloads', () => {
    const event = {
      eventId: 'evt_123456',
      fromStatus: 'submitted',
      toStatus: 'processing',
      operatorUserId: 'usr_operator1',
      operatorName: 'Operator One',
      timestamp: new Date().toISOString(),
      reason: 'Printing started at desk 2',
    };
    const orderWithEvent = OrderRecordSchema.safeParse({
      orderId: 'ord_1234567890abcdef123',
      orderNumber: 'ORD-1002',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef',
      idempotencyKey: 'idem_87654321',
      items: [],
      totalSheets: 0,
      totalAmountMinor: 0,
      currency: 'INR',
      status: 'processing',
      events: [event],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(orderWithEvent.success).toBe(true);
  });
});
