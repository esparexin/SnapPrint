import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { OrderRecord } from '@snapprint/contracts';
import { DocumentConfigForm } from '../app/s/[slug]/document-config-form.js';
import { DocumentPreviewHeader } from '../app/s/[slug]/document-preview-header.js';
import { OrderConfirmationView } from '../app/s/[slug]/order-confirmation-view.js';
import { PhotoItemCard } from '../app/s/[slug]/photo-item-card.js';
import { PhotoUploader } from '../app/s/[slug]/photo-uploader.js';
import {
  createDefaultConfig,
  getFeedbackBannerStyle,
} from '../app/s/[slug]/document-print-workflow-helpers.js';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;

describe('Storefront Lengthy Filename Overflow Protection', () => {
  const lengthyFilename =
    'tax_assessment_annual_income_statement_declaration_and_tds_deduction_certificate_financial_year_2025_2026_signed_and_verified_scan.pdf';

  it('enforces word-break and text wrapping in PhotoUploader feedback banner for lengthy filenames', () => {
    const bannerStyle = getFeedbackBannerStyle('success');
    expect(bannerStyle.wordBreak).toBe('break-word');
    expect(bannerStyle.overflowWrap).toBe('anywhere');
    expect(bannerStyle.minWidth).toBe(0);

    const html = renderToStaticMarkup(
      React.createElement(PhotoUploader, {
        items: [],
        feedback: {
          kind: 'success',
          message: `Uploaded "${lengthyFilename}" successfully.`,
        },
        onDismissFeedback: vi.fn(),
        onFilesSelected: vi.fn(),
        onRetry: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('word-break:break-word');
    expect(html).toContain('min-width:0');
  });

  it('truncates lengthy filenames and sets accessible title in DocumentPreviewHeader', () => {
    const html = renderToStaticMarkup(
      React.createElement(DocumentPreviewHeader, {
        filename: lengthyFilename,
        config: createDefaultConfig('asset_123'),
        pageCount: 3,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain(`title="${lengthyFilename}"`);
    expect(html).toContain('text-overflow:ellipsis');
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('overflow:hidden');
    expect(html).toContain('min-width:0');
  });

  it('truncates lengthy filenames and sets accessible title in DocumentConfigForm', () => {
    const html = renderToStaticMarkup(
      React.createElement(DocumentConfigForm, {
        config: createDefaultConfig('asset_123'),
        filename: lengthyFilename,
        pageCount: 3,
        onUpdate: vi.fn(),
        onPreview: vi.fn(),
        onRemove: vi.fn(),
      })
    );

    expect(html).toContain(`title="${lengthyFilename}"`);
    expect(html).toContain('text-overflow:ellipsis');
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('overflow:hidden');
  });

  it('truncates lengthy filenames in PhotoItemCard and wraps lengthy error text', () => {
    const html = renderToStaticMarkup(
      React.createElement(PhotoItemCard, {
        item: {
          id: 'item_1',
          file: new File(['mock content'], lengthyFilename, { type: 'application/pdf' }),
          previewUrl: '',
          status: 'failed',
          error: `"${lengthyFilename}" exceeds the 50MB file size limit.`,
        },
        onRetry: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain(`title="${lengthyFilename}"`);
    expect(html).toContain('text-overflow:ellipsis');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('word-break:break-word');
  });

  it('enforces word-break and wrapping in OrderConfirmationView line items', () => {
    const orderMock = {
      orderId: 'ord_1234567890123456',
      studioId: 'std_1234567890123456',
      customerName: 'Aarav Sharma',
      customerPhone: '9876543210',
      status: 'pending' as const,
      paymentStatus: 'UNPAID' as const,
      totalAmountMinor: 1500,
      paidAmountMinor: 0,
      totalSheets: 3,
      items: [
        {
          assetId: 'ast_1234567890123456',
          filename: lengthyFilename,
          paperSize: 'a4' as const,
          colorMode: 'black_and_white' as const,
          sides: 'single_sided' as const,
          orientation: 'portrait' as const,
          scaling: 'fit_to_page' as const,
          copies: 1,
          pageCount: 3,
          sheetsCount: 3,
          unitPriceMinor: 500,
          subtotalMinor: 1500,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      React.createElement(OrderConfirmationView, {
        order: orderMock as unknown as OrderRecord,
        slug: 'delhi-print',
        studioName: 'Delhi Print',
        onNewOrder: vi.fn(),
      })
    );

    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('word-break:break-word');
    expect(html).toContain('min-width:0');
  });
});
