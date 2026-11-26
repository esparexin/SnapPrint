import React from 'react';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { OrderPreviewBody } from '../app/components/order-preview-body';
import { OrderPreviewActions } from '../app/components/order-preview-actions';

describe('Order Preview UI Components', () => {
  const dummyItem: QuoteItemBreakdown = {
    assetId: 'asset_preview_1',
    filename: 'document.pdf',
    paperSize: 'A4',
    colorMode: 'black_and_white',
    sides: 'single_sided',
    orientation: 'portrait',
    scaling: 'fit_to_page',
    pageSelection: 'all',
    documentPageCount: 1,
    selectedPagesCount: 1,
    sheetsCount: 1,
    copies: 1,
    unitPriceMinor: 200,
    subtotalMinor: 200,
  };

  it('renders loading state with aria-live and status role', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderPreviewBody, {
        isCancelled: false,
        isDeleted: false,
        loading: true,
        error: null,
        blobUrl: null,
        mimeType: null,
        filename: 'document.pdf',
        orderNumber: 'ORD-101',
        onRetry: vi.fn(),
      })
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Loading document preview...');
  });

  it('renders application-level error banner with retry button on error', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderPreviewBody, {
        isCancelled: false,
        isDeleted: false,
        loading: false,
        error: 'Payment is required before previewing or downloading order documents.',
        blobUrl: null,
        mimeType: null,
        filename: 'document.pdf',
        orderNumber: 'ORD-101',
        onRetry: vi.fn(),
      })
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Document Preview Unavailable');
    expect(html).toContain('Payment is required before previewing');
    expect(html).toContain('↻ Retry Loading');
  });

  it('renders image preview when MIME type is an image', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderPreviewBody, {
        isCancelled: false,
        isDeleted: false,
        loading: false,
        error: null,
        blobUrl: 'blob:http://localhost:3000/123-abc',
        mimeType: 'image/png',
        filename: 'receipt.png',
        orderNumber: 'ORD-101',
        onRetry: vi.fn(),
      })
    );
    expect(html).toContain('<img');
    expect(html).toContain('receipt.png');
    expect(html).not.toContain('<iframe');
  });

  it('disables download button in actions when error or loading occurs', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderPreviewActions, {
        isCompleted: false,
        isDeleted: false,
        isCancelled: false,
        filename: 'doc.pdf',
        orderId: 'ord_1',
        assetId: 'asset_1',
        blobUrl: null,
        hasError: true,
        isLoading: false,
        onClose: vi.fn(),
        onDeleteDocument: vi.fn(),
      })
    );
    expect(html).not.toContain('Download File');
  });
});
