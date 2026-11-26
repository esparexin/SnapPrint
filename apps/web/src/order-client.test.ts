import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentPrintConfig } from '@snapprint/contracts';
import {
  fetchOperatorOrderQueue,
  OrderApiError,
  requestPrintQuote,
  submitPrintOrder,
  updateOperatorOrderStatus,
} from './order-client.js';

describe('Order & Quotation Client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('requests quote and parses response', async () => {
    const mockQuoteResponse = {
      items: [
        {
          assetId: 'asset_1234567890abcdef',
          filename: 'notes.pdf',
          paperSize: 'A4',
          colorMode: 'black_and_white',
          sides: 'single_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          pageSelection: 'all',
          copies: 1,
          documentPageCount: 5,
          selectedPagesCount: 5,
          sheetsCount: 5,
          unitPriceMinor: 200,
          subtotalMinor: 1000,
        },
      ],
      totalSheets: 5,
      totalAmountMinor: 1000,
      currency: 'INR',
      calculatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockQuoteResponse,
    });

    const quote = await requestPrintQuote('alpha-xerox', 'sess_123', 'tok_456', [
      {
        assetId: 'asset_1234567890abcdef',
        paperSize: 'A4',
        colorMode: 'black_and_white',
        sides: 'single_sided',
        orientation: 'portrait',
        scaling: 'fit_to_page',
        pageSelection: 'all',
        copies: 1,
      },
    ]);

    expect(quote.totalAmountMinor).toBe(1000);
    expect(quote.currency).toBe('INR');

    const controller = new AbortController();
    await requestPrintQuote(
      'alpha-xerox',
      'sess_123',
      'tok_456',
      [
        {
          assetId: 'asset_1234567890abcdef',
          paperSize: 'A4',
          colorMode: 'black_and_white',
          sides: 'single_sided',
          orientation: 'portrait',
          scaling: 'fit_to_page',
          pageSelection: 'all',
          copies: 1,
        },
      ],
      controller.signal
    );
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/quote'),
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('submits order and handles errors properly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 'INVALID_PAGES', message: 'Page range out of bounds' }),
    });

    await expect(
      submitPrintOrder('alpha-xerox', 'sess_123', 'tok_456', {
        idempotencyKey: 'idem_12345678',
        items: [
          {
            assetId: 'asset_1234567890abcdef',
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'single_sided',
            orientation: 'portrait',
            scaling: 'fit_to_page',
            pageSelection: 'all',
            copies: 1,
          } as DocumentPrintConfig,
        ],
      })
    ).rejects.toThrow(OrderApiError);
  });

  it('fetches operator queue and updates order status', async () => {
    const mockOrder = {
      orderId: 'ord_1234567890abcdef123',
      orderNumber: 'ORD-1001',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef',
      idempotencyKey: 'idem_12345678',
      items: [],
      totalSheets: 5,
      totalAmountMinor: 1000,
      currency: 'INR',
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ orders: [mockOrder], totalCount: 1 }),
    });

    const queue = await fetchOperatorOrderQueue('std_koramangala');
    expect(queue.orders).toHaveLength(1);
    expect(queue.orders[0].orderNumber).toBe('ORD-1001');

    // Status update
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...mockOrder, status: 'processing' }),
    });

    const updated = await updateOperatorOrderStatus('std_koramangala', 'ord_123', 'processing');
    expect(updated.status).toBe('processing');
  });

  it('constructs operator document download URL and supports status query filtering', async () => {
    const { getOperatorDocumentDownloadUrl } = await import('./order-client.js');
    const downloadUrl = getOperatorDocumentDownloadUrl('std_1', 'ord_2', 'asset_3');
    expect(downloadUrl).toContain('/studios/std_1/orders/ord_2/documents/asset_3/download');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ orders: [], totalCount: 0 }),
    });

    await fetchOperatorOrderQueue('std_1', 'processing');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/studios/std_1/orders?status=processing'),
      expect.anything()
    );
  });

  it('throws OrderApiError with specific error code when hardware is offline', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'AGENT_OFFLINE', message: 'AGENT_OFFLINE' }),
    });

    try {
      await submitPrintOrder('alpha-xerox', 'sess_123', 'tok_456', {
        idempotencyKey: 'idem_12345678',
        items: [],
      });
      expect.fail('Should have thrown OrderApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(OrderApiError);
      expect((err as OrderApiError).statusCode).toBe(403);
      expect((err as OrderApiError).code).toBe('AGENT_OFFLINE');
    }
  });

  it('fetchOperatorDocumentBlob fetches document blob and maps headers or throws on error', async () => {
    const { fetchOperatorDocumentBlob } = await import('./order-client.js');
    const mockBlob = new Blob(['%PDF-1.4 sample content'], { type: 'application/pdf' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: async () => mockBlob,
    });

    const result = await fetchOperatorDocumentBlob('std_1', 'ord_1', 'asset_1');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.blob).toBe(mockBlob);

    // Error case
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: async () => ({
        code: 'DOCUMENT_DELETED',
        message: 'Preview unavailable — document deleted',
      }),
    });

    await expect(fetchOperatorDocumentBlob('std_1', 'ord_1', 'asset_1')).rejects.toThrow(
      'Preview unavailable — document deleted'
    );
  });
});
