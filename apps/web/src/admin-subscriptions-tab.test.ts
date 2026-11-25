import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminSubscriptionsView } from '../app/admin/admin-subscriptions-view';
import { sortStudios } from '../app/admin/admin-subscription-helpers';
import { PlatformStudioItem } from '@snapprint/contracts';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Admin Subscriptions Tab View', () => {
  const sampleStudios: PlatformStudioItem[] = [
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
  ];

  it('renders tenant subscriptions table with category, plan details, dates, and clean metric cards', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminSubscriptionsView, {
        studios: sampleStudios,
        loading: false,
        onInspect: vi.fn(),
        onManageSubscription: vi.fn(),
      })
    );

    expect(html).toContain('Tenant Subscriptions');
    expect(html).toContain('Total Tenants');
    expect(html).toContain('Free Plan Users');
    expect(html).toContain('Paid Plan Users');
    expect(html).toContain('Not Enrolled');
    expect(html).toContain('Expired');

    // Dummy / legacy duration cards are removed
    expect(html).not.toContain('1 Month (30d)');
    expect(html).not.toContain('3 Months (90d)');

    // Vikram Mobiles - Paid Quarterly Plan
    expect(html).toContain('Vikram Mobiles');
    expect(html).toContain('Paid Plan');
    expect(html).toContain('Quarterly Plan');
    expect(html).toContain('⚡ Manage Plan');
    expect(html).toContain('✉️ Email');

    // HANVIKA IT SOLUTIONS - Free Plan
    expect(html).toContain('HANVIKA IT SOLUTIONS');
    expect(html).toContain('Free Plan');

    // New Studio - Not Enrolled
    expect(html).toContain('New Studio');
    expect(html).toContain('⚡ Assign Plan');
  });

  it('supports sorting studios by column asc and desc', () => {
    const sortedByStudioAsc = sortStudios(sampleStudios, 'studio', 'asc');
    expect(sortedByStudioAsc[0].name).toBe('HANVIKA IT SOLUTIONS');
    expect(sortedByStudioAsc[2].name).toBe('Vikram Mobiles');

    const sortedByStudioDesc = sortStudios(sampleStudios, 'studio', 'desc');
    expect(sortedByStudioDesc[0].name).toBe('Vikram Mobiles');
    expect(sortedByStudioDesc[2].name).toBe('HANVIKA IT SOLUTIONS');

    const sortedByCategoryAsc = sortStudios(sampleStudios, 'category', 'asc');
    expect(sortedByCategoryAsc[0].subscription?.plan).toBe('free');

    const sortedByPlanDesc = sortStudios(sampleStudios, 'plan', 'desc');
    expect(sortedByPlanDesc[0].subscription?.plan).toBe('quarterly');

    const sortedByExpiresAsc = sortStudios(sampleStudios, 'expiresAt', 'asc');
    expect(sortedByExpiresAsc[0].id).toBe('std_3'); // un-enrolled studio (time = 0)
    expect(sortedByExpiresAsc[1].id).toBe('std_2'); // expires 2026-12-20
    expect(sortedByExpiresAsc[2].id).toBe('std_1'); // expires 2027-02-20
  });
});
