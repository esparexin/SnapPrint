import React from 'react';
// @ts-expect-error -- @types/react-dom is not installed in @snapprint/web
import { renderToStaticMarkup as untypedRenderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const renderToStaticMarkup = untypedRenderToStaticMarkup as (element: React.ReactElement) => string;
import { DocumentConfigForm } from '../app/s/[slug]/document-config-form.js';
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
    expect(idleHtml).toContain('🗑️ Delete');
    expect(idleHtml).not.toContain('disabled=""');

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
    expect(removingHtml).toContain('disabled=""');
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
