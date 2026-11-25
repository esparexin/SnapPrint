import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderQueueFilterBar } from '../app/components/order-queue-filter-bar.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('OrderQueueFilterBar', () => {
  it('renders all order status filter tabs including Cancelled', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueFilterBar, {
        statusFilter: 'all',
        onSelectStatus: vi.fn(),
      })
    );

    expect(html).toContain('All Orders');
    expect(html).toContain('Submitted');
    expect(html).toContain('Processing');
    expect(html).toContain('Ready');
    expect(html).toContain('Completed');
    expect(html).toContain('Cancelled');
  });

  it('highlights the currently selected status tab', () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderQueueFilterBar, {
        statusFilter: 'cancelled',
        onSelectStatus: vi.fn(),
      })
    );

    expect(html).toContain('Cancelled');
    expect(html).toContain('#e0f2fe'); // selected bg
  });
});
