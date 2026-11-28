import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord, QuoteItemBreakdown } from '@snapprint/contracts';
import { ConfirmModal } from '../app/components/confirm-modal';
import { OrderQueueActions } from '../app/components/order-queue-actions';
import { OrderQueueDocumentRow } from '../app/components/order-queue-document-row';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('ConfirmModal Component', () => {
  it('configures ModalSheetShell with title, styles, and nesting props', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const vnode = ConfirmModal({
      isOpen: true,
      isNested: true,
      title: 'Purge Document',
      message: 'Permanently delete this document?',
      variant: 'danger',
      confirmLabel: 'Purge',
      onConfirm,
      onClose,
    });

    expect(vnode.props.isOpen).toBe(true);
    expect(vnode.props.isNested).toBe(true);
    expect(vnode.props.title.props.children).toBe('Purge Document');
    expect(vnode.props.title.props.style.color).toBe('#b91c1c');
    expect(vnode.props.onClose).toBe(onClose);
  });

  it('renders message, cancel button, and confirm button by default', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        inShell: true,
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel order ORD-1234?',
        confirmLabel: 'Yes, Cancel Order',
        cancelLabel: 'Keep Order',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Are you sure you want to cancel order ORD-1234?');
    expect(html).toContain('Yes, Cancel Order');
    expect(html).toContain('Keep Order');
  });

  it('renders danger variant styling when specified', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        inShell: true,
        title: 'Purge Document',
        message: 'Permanently delete this document?',
        variant: 'danger',
        confirmLabel: 'Purge',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Permanently delete this document?');
    expect(html).toContain('#dc2626');
    expect(html).toContain('Purge');
  });

  it('hides cancel button in alert-only mode (hideCancel: true)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        inShell: true,
        title: 'Notification Error',
        message: 'Failed to queue notification email.',
        confirmLabel: 'OK',
        hideCancel: true,
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Failed to queue notification email.');
    expect(html).toContain('OK');
    expect(html).not.toContain('Cancel');
  });

  it('renders loading state when isPending is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        inShell: true,
        title: 'Purging...',
        message: 'Please wait while file is removed.',
        isPending: true,
        confirmLabel: 'Purge',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Please wait...');
    expect(html).toContain('disabled=""');
  });

  it('does not render markup when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: false,
        inShell: true,
        title: 'Hidden Dialog',
        message: 'Hidden message',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toBe('');
  });

  it('renders cancel action button in OrderQueueActions', () => {
    const dummyOrder: OrderRecord = {
      orderId: 'ord_1',
      orderNumber: 'DSP-101',
      studioId: 'std_1',
      sessionId: 'sess_1',
      idempotencyKey: 'idem_1',
      totalSheets: 1,
      totalAmountMinor: 100,
      currency: 'INR',
      status: 'submitted',
      events: [],
      items: [],
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueActions, {
        order: dummyOrder,
        updating: false,
        onStatusChange: vi.fn(),
      })
    );
    expect(html).toContain('✕ Cancel');
  });

  it('renders purge action button in OrderQueueDocumentRow for completed order', () => {
    const completedOrder: OrderRecord = {
      orderId: 'ord_1',
      orderNumber: 'DSP-101',
      studioId: 'std_1',
      sessionId: 'sess_1',
      idempotencyKey: 'idem_1',
      totalSheets: 1,
      totalAmountMinor: 100,
      currency: 'INR',
      status: 'completed',
      events: [],
      items: [],
      createdAt: '2026-11-27T00:00:00.000Z',
      updatedAt: '2026-11-27T00:00:00.000Z',
    };
    const item: QuoteItemBreakdown = {
      assetId: 'asset_1',
      filename: 'sample.pdf',
      paperSize: 'a4',
      colorMode: 'color',
      sides: 'single_sided',
      orientation: 'portrait',
      scaling: 'fit_to_page',
      pageSelection: 'all',
      documentPageCount: 1,
      selectedPagesCount: 1,
      sheetsCount: 1,
      copies: 1,
      unitPriceMinor: 50,
      subtotalMinor: 50,
      isDeleted: false,
    };
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueDocumentRow, {
        order: completedOrder,
        item,
        onPreview: vi.fn(),
        onDeleteDocument: vi.fn(),
      })
    );
    expect(html).toContain('🗑️ Purge');
  });
});
