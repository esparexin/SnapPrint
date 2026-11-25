import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminPlansView } from '../app/admin/admin-plans-view';
import { AdminPlanModal } from '../app/admin/admin-plan-modal';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Admin Plans Tab & Modal View', () => {
  it('renders plans catalog container', () => {
    const html = renderToStaticMarkup(React.createElement(AdminPlansView));
    expect(html).toContain('Subscription Plans Catalog');
    expect(html).toContain('+ Add New Plan');
    expect(html).toContain('PLAN NAME');
    expect(html).toContain('CATEGORY');
    expect(html).toContain('DURATION');
    expect(html).toContain('PRICE');
  });

  it('renders admin plan modal for creating a new plan', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminPlanModal, {
        plan: null,
        onClose: vi.fn(),
        onSaved: vi.fn(),
      })
    );
    expect(html).toContain('Add New Subscription Plan');
    expect(html).toContain('Plan Identifier (ID)');
    expect(html).toContain('Duration (Days)');
    expect(html).toContain('Price (₹)');
  });

  it('renders admin plan modal for editing an existing plan', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminPlanModal, {
        plan: {
          id: 'free',
          name: 'Free Trial',
          durationDays: 31,
          priceRupees: 0,
          category: 'free',
          intervalMonths: 1,
          isActive: true,
          description: '31-day trial',
        },
        onClose: vi.fn(),
        onSaved: vi.fn(),
      })
    );
    expect(html).toContain('Edit Plan: Free Trial');
    expect(html).toContain('31');
    expect(html).toContain('Update Plan');
  });
});
