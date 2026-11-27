import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { OrderDocumentPreviewModal } from '../app/components/order-document-preview-modal.js';
import { OrderHandoverChecklist } from '../app/components/order-handover-checklist.js';
import { OrderQueueDocumentRow } from '../app/components/order-queue-document-row.js';
import { formatStudioOptionLabel } from '../app/components/studio-selector.js';
import { CustomerPaymentCard } from '../app/s/[slug]/customer-payment-card.js';
import { resolveFormatLabel } from '../app/s/[slug]/format-size-label.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Frontend ID and Hardcoded Value Prevention', () => {
  const customItem: QuoteItemBreakdown = {
    assetId: 'asset_custom_doc_1',
    filename: 'banner_print.pdf',
    paperSize: 'cps_poster_12x18',
    colorMode: 'color',
    sides: 'double_sided',
    orientation: 'portrait',
    scaling: 'fit_to_page',
    pageSelection: 'all',
    documentPageCount: 2,
    selectedPagesCount: 2,
    sheetsCount: 1,
    copies: 3,
    unitPriceMinor: 1500,
    subtotalMinor: 4500,
  };

  const sampleOrder: OrderRecord = {
    orderId: 'ord_test_labels',
    orderNumber: 'ORD-7890',
    studioId: 'std_test_studio',
    sessionId: 'ses_test',
    idempotencyKey: 'idem_test_labels',
    currency: 'INR',
    status: 'processing',
    totalAmountMinor: 4500,
    totalSheets: 3,
    customerName: 'Alex Customer',
    items: [customItem],
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('resolves format labels for custom paper sizes without leaking raw cps_ IDs', () => {
    const customSummaries = [
      { id: 'cps_poster_12x18', name: '12x18 Poster', width: 12, height: 18, unit: 'in' as const },
    ];
    expect(resolveFormatLabel('cps_poster_12x18', customSummaries)).toBe('12x18 Poster');
    expect(resolveFormatLabel('cps_poster_12x18')).toBe('Poster 12x18');
    expect(resolveFormatLabel('cps_unknown')).toBe('Unknown');
    expect(resolveFormatLabel('cps_1234567890abcdef')).toBe('Custom Size');
  });

  it('renders resolved format name in OrderQueueDocumentRow without raw CPS_ IDs', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: sampleOrder,
        item: customItem,
        onPreview: vi.fn(),
      })
    );

    expect(html).toContain('Poster 12x18');
    expect(html).not.toContain('CPS_POSTER_12X18');
    expect(html).not.toMatch(/\bcps_[a-z0-9_]+/i);
  });

  it('renders resolved format name in OrderDocumentPreviewModal header', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderDocumentPreviewModal, {
        studioId: 'std_test_studio',
        order: sampleOrder,
        item: customItem,
        onClose: vi.fn(),
        onDeleteDocument: vi.fn(),
      })
    );

    expect(html).toContain('Poster 12x18');
    expect(html).not.toContain('CPS_POSTER_12X18');
  });

  it('renders resolved format name in OrderHandoverChecklist', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderHandoverChecklist, {
        items: [customItem],
      })
    );

    expect(html).toContain('Poster 12x18');
    expect(html).not.toContain('CPS_POSTER_12X18');
  });

  it('renders clean friendly studio name in studio-selector without forcing raw studioId', () => {
    const label = formatStudioOptionLabel(
      { studioId: 'std_999' },
      { std_999: 'Downtown Xerox Shop' }
    );
    expect(label).toBe('Downtown Xerox Shop');
    expect(label).not.toContain('(std_999)');
  });

  it('renders CustomerPaymentCard with dynamic studio name prop support', () => {
    const html = renderToStaticMarkup(
      React.createElement(CustomerPaymentCard, {
        order: sampleOrder,
        slug: 'test-studio',
        studioName: 'Downtown Xerox Shop',
        payment: {
          enableCounterPayment: true,
          enableOnlinePayment: false,
          isRazorpayConfirmed: false,
        },
        onPaymentSuccess: vi.fn(),
      })
    );
    expect(html).toContain('Pay at Counter');
    expect(html).toContain('#ORD-7890');
  });
});
