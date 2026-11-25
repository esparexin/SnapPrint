import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminSubscriptionsView } from '../app/admin/admin-subscriptions-view';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Admin Subscriptions Tab View', () => {
  it('renders tenant plans & subscriptions table', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminSubscriptionsView, {
        studios: [
          {
            id: 'std_1',
            slug: 'vikram-mobiles',
            name: 'Vikram Mobiles',
            status: 'active',
            createdAt: '2026-11-20T00:00:00.000Z',
            updatedAt: '2026-11-20T00:00:00.000Z',
            subscription: {
              plan: 'quarterly',
              status: 'active',
              expiresAt: '2027-02-20T00:00:00.000Z',
            },
          },
        ],
        loading: false,
        onInspect: vi.fn(),
        onManageSubscription: vi.fn(),
      })
    );

    expect(html).toContain('Tenant Plans &amp; Subscriptions');
    expect(html).toContain('Vikram Mobiles');
    expect(html).toContain('Quarterly');
  });
});
