import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderRecord } from '@snapprint/contracts';
import { CustomerPaymentCard } from '../app/s/[slug]/customer-payment-card';
import { SlideToPay } from '../components/ui/slide-to-pay';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('SlideToPay Component', () => {
  it('renders dual-direction mode with Cash and Online labels and amounts', () => {
    const html = renderToStaticMarkup(
      React.createElement(SlideToPay, {
        amountFormatted: '₹145.00',
        enableOnline: true,
        onSelectCash: vi.fn(),
        onSelectOnline: vi.fn(),
      })
    );

    expect(html).toContain('CASH');
    expect(html).toContain('ONLINE');
    expect(html).toContain('₹145.00');
    expect(html).toContain('role="slider"');
    expect(html).toContain('Slide left for Cash, right for Online');
  });

  it('renders single-direction Cash mode when Online is disabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(SlideToPay, {
        amountFormatted: '₹145.00',
        enableOnline: false,
        onSelectCash: vi.fn(),
      })
    );

    expect(html).toContain('SLIDE TO CONFIRM CASH AT COUNTER · ₹145.00');
    expect(html).not.toContain('ONLINE');
    expect(html).toContain('Slide right for Cash');
  });

  it('renders confirmed Cash state with change button', () => {
    const html = renderToStaticMarkup(
      React.createElement(SlideToPay, {
        amountFormatted: '₹145.00',
        selectedMethod: 'cash',
        onSelectCash: vi.fn(),
        onReset: vi.fn(),
      })
    );

    expect(html).toContain('✓ Cash Payment Selected · ₹145.00');
    expect(html).toContain('Change ↺');
  });

  it('renders loading state on the draggable handle', () => {
    const html = renderToStaticMarkup(
      React.createElement(SlideToPay, {
        amountFormatted: '₹145.00',
        loading: true,
        onSelectCash: vi.fn(),
      })
    );

    expect(html).toContain('⟳');
  });

  it('renders seamlessly inside CustomerPaymentCard without redundant badges', () => {
    const mockOrder: OrderRecord = {
      orderId: 'ord_test_slide',
      orderNumber: 'ORD-9999',
      studioId: 'std_test',
      sessionId: 'ses_test',
      idempotencyKey: 'idem_test',
      currency: 'INR',
      status: 'submitted',
      paymentStatus: 'UNPAID',
      totalAmountMinor: 14500,
      totalSheets: 2,
      items: [],
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      React.createElement(CustomerPaymentCard, {
        order: mockOrder,
        slug: 'test-studio',
        payment: {
          enableCounterPayment: true,
          enableOnlinePayment: true,
          isRazorpayConfirmed: true,
        },
        onPaymentSuccess: vi.fn(),
      })
    );

    expect(html).toContain('CASH');
    expect(html).toContain('ONLINE');
    expect(html).toContain('₹145.00');
    expect(html).not.toContain('PAYMENT DUE');
    expect(html).not.toContain('UNPAID');
  });
});
