import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { OrderFulfillmentList } from '../app/components/order-fulfillment-list.js';
import { OrderQueueDocumentRow } from '../app/components/order-queue-document-row.js';
import { mapPreviewError } from '../app/hooks/use-order-document-preview.js';
import { OrderApiError } from './order-client.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

const dummyOrder: OrderRecord = {
  orderId: 'ord_test_unavailable_1',
  orderNumber: 'SN-UNAV-01',
  studioId: 'std_test_1',
  sessionId: 'sess_test_1',
  idempotencyKey: 'idemp_unav_1',
  totalSheets: 2,
  totalAmountMinor: 400,
  currency: 'INR',
  status: 'processing',
  events: [],
  createdAt: '2026-11-27T10:00:00.000Z',
  updatedAt: '2026-11-27T10:05:00.000Z',
  items: [
    {
      assetId: 'asset_missing_1',
      filename: 'document_expired.pdf',
      paperSize: 'a4',
      colorMode: 'black_and_white',
      sides: 'single_sided',
      orientation: 'portrait',
      scaling: 'fit_to_page',
      pageSelection: 'all',
      documentPageCount: 2,
      selectedPagesCount: 2,
      sheetsCount: 2,
      copies: 1,
      unitPriceMinor: 200,
      subtotalMinor: 400,
    },
  ],
};

const sampleItem: QuoteItemBreakdown = dummyOrder.items[0];

describe('Order Document Preview 404 & Unavailable Handling', () => {
  it('renders disabled preview button with "🚫 No Preview" when document is unavailable (e.g. 404)', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: dummyOrder,
        item: sampleItem,
        isUnavailable: true,
        onPreview: vi.fn(),
      })
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('not-allowed');
    expect(html).toContain('🚫 No Preview');
    expect(html).toContain('title="Document preview is unavailable (file not found in storage)"');
  });

  it('renders normal active preview button when document is available', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: dummyOrder,
        item: sampleItem,
        isUnavailable: false,
        onPreview: vi.fn(),
      })
    );

    expect(html).not.toContain('disabled=""');
    expect(html).toContain('📄 Preview');
    expect(html).toContain('title="Preview document_expired.pdf"');
  });

  it('propagates unavailableAssetIds from OrderFulfillmentList down to document rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderFulfillmentList, {
        orders: [dummyOrder],
        loading: false,
        error: null,
        updatingId: null,
        unavailableAssetIds: new Set(['asset_missing_1']),
        onStatusChange: vi.fn(),
        onRequestHandover: vi.fn(),
        onPreviewItem: vi.fn(),
        onDeleteDocument: vi.fn().mockResolvedValue(undefined),
      })
    );

    expect(html).toContain('🚫 No Preview');
    expect(html).toContain('disabled=""');
  });

  it('maps HTTP 404 preview errors cleanly in mapPreviewError', () => {
    const err404 = new OrderApiError('Not found', 404, 'FILE_NOT_FOUND');
    const msg = mapPreviewError(err404);
    expect(msg).toContain('Document binary was not found in private storage');
  });

  it('maps HTTP 403 payment-required and 410 deleted errors cleanly', () => {
    const err403 = new OrderApiError('Forbidden', 403, 'PAYMENT_REQUIRED_BEFORE_PRINT');
    expect(mapPreviewError(err403)).toContain('Payment is required before previewing');

    const err410 = new OrderApiError('Deleted', 410, 'DOCUMENT_DELETED');
    expect(mapPreviewError(err410)).toContain('permanently deleted');
  });
});
