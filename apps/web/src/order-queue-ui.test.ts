import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord } from '@snapprint/contracts';
import { OrderFulfillmentList } from '../app/components/order-fulfillment-list.js';
import { OrderQueueActions } from '../app/components/order-queue-actions.js';

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
});
