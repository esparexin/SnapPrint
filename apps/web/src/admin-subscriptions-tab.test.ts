import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminSubscriptionsView } from '../app/admin/admin-subscriptions-view';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Admin Subscriptions Tab View', () => {
  it('renders tenant subscriptions table with category, plan details, dates, and email trigger', () => {
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
              startsAt: '2026-11-20T00:00:00.000Z',
              expiresAt: '2027-02-20T00:00:00.000Z',
            },
          },
          {
            id: 'std_2',
            slug: 'hanvika-it-solutions',
            name: 'HANVIKA IT SOLUTIONS',
            status: 'active',
            createdAt: '2026-11-20T00:00:00.000Z',
            updatedAt: '2026-11-20T00:00:00.000Z',
            subscription: {
              plan: 'free',
              status: 'active',
              startsAt: '2026-11-20T00:00:00.000Z',
              expiresAt: '2026-12-20T00:00:00.000Z',
            },
          },
          {
            id: 'std_3',
            slug: 'new-studio',
            name: 'New Studio',
            status: 'active',
            createdAt: '2026-11-20T00:00:00.000Z',
            updatedAt: '2026-11-20T00:00:00.000Z',
          },
        ],
        loading: false,
        onInspect: vi.fn(),
        onManageSubscription: vi.fn(),
      })
    );

    expect(html).toContain('Tenant Subscriptions');
    expect(html).toContain('Total Tenants');
    expect(html).toContain('Free Plan Users');
    expect(html).toContain('Paid Plan Users');
    expect(html).toContain('1 Month');
    expect(html).toContain('3 Months');

    // Vikram Mobiles - Paid Quarterly
    expect(html).toContain('Vikram Mobiles');
    expect(html).toContain('Paid Plan');
    expect(html).toContain('3 Months (90d)');
    expect(html).toContain('⚡ Manage Plan');
    expect(html).toContain('✉️ Email');

    // HANVIKA IT SOLUTIONS - Free Plan
    expect(html).toContain('HANVIKA IT SOLUTIONS');
    expect(html).toContain('Free Plan');
    expect(html).toContain('1 Month (30d)');

    // New Studio - Not Enrolled
    expect(html).toContain('New Studio');
    expect(html).toContain('Not Enrolled');
    expect(html).toContain('⚡ Assign Plan');
  });
});
