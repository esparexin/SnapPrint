import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;
import { CustomerStudioHeader } from '../app/s/[slug]/customer-status-views.js';
import { DocumentConfigForm } from '../app/s/[slug]/document-config-form.js';
import { OrderItemsBreakdown } from '../app/s/[slug]/order-items-breakdown.js';
import { OrderStickyCtaBar } from '../app/s/[slug]/order-sticky-cta-bar.js';
import { PhotoUploader } from '../app/s/[slug]/photo-uploader.js';
import {
  createDefaultConfig,
  inferUploadMimeType,
  reconcileDocumentConfigs,
  resolvePreviewTarget,
  validateAndQueueFiles,
} from '../app/s/[slug]/document-print-workflow-helpers.js';

describe('Storefront Markup, Accessibility & Helper Logic', () => {
  it('renders accessible polite upload/delete success and assertive error banners in PhotoUploader', () => {
    const successHtml = renderToStaticMarkup(
      React.createElement(PhotoUploader, {
        items: [],
        feedback: { kind: 'success', message: 'Uploaded "syllabus.pdf" successfully.' },
        onDismissFeedback: vi.fn(),
        onFilesSelected: vi.fn(),
        onRetry: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
      })
    );
    expect(successHtml).toContain('role="status"');
    expect(successHtml).toContain('aria-live="polite"');
    expect(successHtml).toContain('Uploaded &quot;syllabus.pdf&quot; successfully.');
    expect(successHtml).toContain('aria-label="Dismiss status message"');

    const errorHtml = renderToStaticMarkup(
      React.createElement(PhotoUploader, {
        items: [],
        feedback: { kind: 'error', message: 'Failed to delete "photo.png".' },
        onDismissFeedback: vi.fn(),
        onFilesSelected: vi.fn(),
        onRetry: vi.fn(),
        onCancel: vi.fn(),
        onDelete: vi.fn(),
      })
    );
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain('aria-live="assertive"');
    expect(errorHtml).toContain('Failed to delete &quot;photo.png&quot;.');
  });

  it('renders accessible Delete state and disables button while removing in DocumentConfigForm', () => {
    const idleHtml = renderToStaticMarkup(
      React.createElement(DocumentConfigForm, {
        config: createDefaultConfig('asset_1234567890abcdef'),
        filename: 'report.pdf',
        pageCount: 4,
        isRemoving: false,
        onUpdate: vi.fn(),
        onPreview: vi.fn(),
        onRemove: vi.fn(),
      })
    );
    expect(idleHtml).toContain('aria-label="Delete report.pdf"');
    expect(idleHtml).toContain('aria-label="Preview report.pdf"');
    expect(idleHtml).toContain('Delete');
    expect(idleHtml).toContain('role="radiogroup"');
    expect(idleHtml).toContain('aria-label="Paper Size"');
    expect(idleHtml).toContain('aria-label="Orientation"');
    expect(idleHtml).not.toContain('▯');
    const idleDeleteBtn = idleHtml.match(/<button[^>]*aria-label="Delete report\.pdf"[^>]*>/)?.[0];
    expect(idleDeleteBtn).toBeTruthy();
    expect(idleDeleteBtn).not.toContain('disabled=""');
    expect(idleHtml).toContain('aria-label="Decrease copies" disabled=""');

    const removingHtml = renderToStaticMarkup(
      React.createElement(DocumentConfigForm, {
        config: createDefaultConfig('asset_1234567890abcdef'),
        filename: 'report.pdf',
        pageCount: 4,
        isRemoving: true,
        onUpdate: vi.fn(),
        onPreview: vi.fn(),
        onRemove: vi.fn(),
      })
    );
    expect(removingHtml).toContain('Deleting...');
    const removingDeleteBtn = removingHtml.match(
      /<button[^>]*aria-label="Delete report\.pdf"[^>]*>/
    )?.[0];
    expect(removingDeleteBtn).toContain('disabled=""');
  });

  it('renders left-aligned storefront header lockup, singular sheet grammar, and accessible sticky CTA bar', () => {
    const headerHtml = renderToStaticMarkup(
      React.createElement(CustomerStudioHeader, {
        studio: { name: 'Vikram Mobiles', contactPhone: '9876543210' },
      })
    );
    expect(headerHtml).toContain('sf-header');
    expect(headerHtml).toContain('sf-brand-logo');
    expect(headerHtml).toContain('Vikram Mobiles');
    expect(headerHtml).toContain('Xerox &amp; Digital Document Printing');

    const singlePageConfigHtml = renderToStaticMarkup(
      React.createElement(DocumentConfigForm, {
        config: createDefaultConfig('asset_1234567890abcdef'),
        filename: '2.png',
        pageCount: 1,
        onUpdate: vi.fn(),
        onPreview: vi.fn(),
        onRemove: vi.fn(),
      })
    );
    expect(singlePageConfigHtml).toContain('1 (Single page)');
    expect(singlePageConfigHtml).toContain('aria-label="Decrease copies"');
    expect(singlePageConfigHtml).toContain('aria-label="Increase copies"');

    const breakdownHtml = renderToStaticMarkup(
      React.createElement(OrderItemsBreakdown, {
        items: [
          {
            assetId: 'asset_1234567890abcdef',
            filename: '2.png',
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'single_sided',
            orientation: 'portrait',
            scaling: 'fit_to_page',
            pageSelection: 'all',
            copies: 1,
            documentPageCount: 1,
            selectedPagesCount: 1,
            sheetsCount: 1,
            unitPriceMinor: 200,
            subtotalMinor: 200,
          },
        ],
      })
    );
    expect(breakdownHtml).toContain('1 sheet × 1 copy');

    const stickyHtml = renderToStaticMarkup(
      React.createElement(OrderStickyCtaBar, {
        quote: null,
        loadingQuote: false,
        submitting: false,
        isAcceptingOrders: false,
        onSubmit: vi.fn(),
      })
    );
    expect(stickyHtml).toContain('sf-sticky-bar');
    expect(stickyHtml).toContain('Printer Offline');
  });

  it('infers MIME types cleanly, reconciles configs on delete, and resolves preview targets', () => {
    expect(inferUploadMimeType({ name: 'scan.PDF', type: '' })).toBe('application/pdf');
    expect(inferUploadMimeType({ name: 'photo.jpg', type: '' })).toBe('image/jpeg');
    expect(inferUploadMimeType({ name: 'img.png', type: 'image/png' })).toBe('image/png');
    expect(
      inferUploadMimeType({ name: 'script.exe', type: 'application/x-msdownload' })
    ).toBeNull();

    const pdfDoc = { assetId: 'asset_pdf_1234567890', filename: 'a.pdf', pageCount: 3 };
    const pngDoc = { assetId: 'asset_png_1234567890', filename: 'b.png', pageCount: 1 };
    const customPdfConfig = { ...createDefaultConfig(pdfDoc.assetId), copies: 4 };

    const reconciled = reconcileDocumentConfigs(
      [pdfDoc],
      [customPdfConfig, createDefaultConfig(pngDoc.assetId)]
    );
    expect(reconciled).toEqual([customPdfConfig]);
    expect(resolvePreviewTarget([pdfDoc], reconciled, pngDoc.assetId)).toBeNull();
    expect(resolvePreviewTarget([pdfDoc], reconciled, pdfDoc.assetId)?.config.copies).toBe(4);

    const { queued, error } = validateAndQueueFiles(
      [
        new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }),
        new File(['bad'], 'bad.txt', { type: 'text/plain' }),
      ],
      0,
      () => 'blob:mock'
    );
    expect(queued).toHaveLength(1);
    expect(queued[0].mimeType).toBe('application/pdf');
    expect(error).toContain('not a supported document format');
  });
});
