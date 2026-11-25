import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { OrderDocumentPreviewModal } from '../app/components/order-document-preview-modal.js';
import { OrderFulfillmentList } from '../app/components/order-fulfillment-list.js';
import { OrderQueueActions } from '../app/components/order-queue-actions.js';
import { OrderQueueDocumentRow } from '../app/components/order-queue-document-row.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Order Queue UI States & Feedback', () => {
  const dummyOrder: OrderRecord = {
    orderId: 'ord_test_queue_1',
    orderNumber: 'DSP-1001',
    studioId: 'std_test_1',
    sessionId: 'sess_1',
    idempotencyKey: 'idem_1',
    items: [],
    totalSheets: 2,
    totalAmountMinor: 400,
    paidAmountMinor: 400,
    currency: 'INR',
    status: 'submitted',
    paymentStatus: 'PAID',
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders visible error alert banner with role="alert" and dismiss button', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderFulfillmentList, {
        orders: [dummyOrder],
        loading: false,
        error: '⚠️ Payment Required: Collect payment before printing this order.',
        updatingId: null,
        onStatusChange: vi.fn(),
        onRecordPayment: vi.fn(),
        onRequestHandover: vi.fn(),
        onPreviewItem: vi.fn(),
        onDeleteDocument: vi.fn(),
        onDismissError: vi.fn(),
      })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('⚠️ Payment Required: Collect payment before printing this order.');
    expect(html).toContain('aria-label="Dismiss error"');
  });

  it('renders visible success feedback banner with role="status" and dismiss button', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderFulfillmentList, {
        orders: [dummyOrder],
        loading: false,
        error: null,
        successMessage: 'Order #DSP-1001 printing started & dispatched to printer spooler.',
        updatingId: null,
        onStatusChange: vi.fn(),
        onRecordPayment: vi.fn(),
        onRequestHandover: vi.fn(),
        onPreviewItem: vi.fn(),
        onDeleteDocument: vi.fn(),
        onDismissSuccess: vi.fn(),
      })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Order #DSP-1001 printing started');
    expect(html).toContain('dispatched to printer spooler.');
    expect(html).toContain('aria-label="Dismiss message"');
  });

  it('renders disabled "⏳ Dispatching..." loading state during active status update', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: dummyOrder,
        updating: true,
        onStatusChange: vi.fn(),
      })
    );

    expect(html).toContain('⏳ Dispatching...');
    expect(html).toContain('disabled=""');
    expect(html).toContain('not-allowed');
  });

  it('renders enabled "🖨️ Start Printing" button when idle', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: dummyOrder,
        updating: false,
        onStatusChange: vi.fn(),
      })
    );

    expect(html).toContain('🖨️ Start Printing');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('⏳ Dispatching...');
  });

  it('renders "💰 Collect Payment" button for active unpaid order', () => {
    const unpaidOrder: OrderRecord = {
      ...dummyOrder,
      status: 'submitted',
      paymentStatus: 'UNPAID',
      paidAmountMinor: 0,
    };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: unpaidOrder,
        updating: false,
        onStatusChange: vi.fn(),
        onCollectPayment: vi.fn(),
      })
    );

    expect(html).toContain('💰 Collect Payment');
  });

  it('does NOT render "Collect Payment" button for cancelled order even if unpaid', () => {
    const cancelledOrder: OrderRecord = {
      ...dummyOrder,
      status: 'cancelled',
      paymentStatus: 'UNPAID',
      paidAmountMinor: 0,
    };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: cancelledOrder,
        updating: false,
        onStatusChange: vi.fn(),
        onCollectPayment: vi.fn(),
      })
    );

    expect(html).not.toContain('Collect Payment');
    expect(html).not.toContain('Record Payment');
  });

  it('does NOT render "Collect Payment" button for fully paid order', () => {
    const paidOrder: OrderRecord = {
      ...dummyOrder,
      status: 'submitted',
      paymentStatus: 'PAID',
      paidAmountMinor: 400,
    };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: paidOrder,
        updating: false,
        onStatusChange: vi.fn(),
        onCollectPayment: vi.fn(),
      })
    );

    expect(html).not.toContain('Collect Payment');
    expect(html).not.toContain('Record Payment');
  });

  const sampleItem: QuoteItemBreakdown = {
    assetId: 'asset_doc_1',
    filename: 'test.pdf',
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

  it('renders disabled (inactive) preview button when order is cancelled', () => {
    const cancelledOrder: OrderRecord = { ...dummyOrder, status: 'cancelled' };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: cancelledOrder,
        item: sampleItem,
        onPreview: vi.fn(),
      })
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('not-allowed');
    expect(html).toContain('🚫 Preview');
  });

  it('renders disabled (inactive) preview button when document is deleted', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: dummyOrder,
        item: { ...sampleItem, isDeleted: true },
        onPreview: vi.fn(),
      })
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('not-allowed');
    expect(html).toContain('🔒 Deleted');
  });

  it('renders active enabled preview button when order is active and document exists', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: dummyOrder,
        item: sampleItem,
        onPreview: vi.fn(),
      })
    );

    expect(html).not.toContain('disabled=""');
    expect(html).toContain('📄 Preview');
  });

  it('renders "Preview Unavailable" feedback and hides full page link in modal when order is cancelled', () => {
    const cancelledOrder: OrderRecord = { ...dummyOrder, status: 'cancelled' };
    const html = renderToStaticMarkup(
      React.createElement(OrderDocumentPreviewModal, {
        studioId: 'std_test_1',
        order: cancelledOrder,
        item: sampleItem,
        onClose: vi.fn(),
        onDeleteDocument: vi.fn(),
      })
    );

    expect(html).toContain('Preview Unavailable');
    expect(html).toContain('Document preview is unavailable because order');
    expect(html).not.toContain('Open Full Page');
  });
});
