import { describe, expect, it } from 'vitest';
import { inspectPdf, isPdfBuffer } from './pdf-inspector.js';

describe('PDF Inspector Logic', () => {
  it('correctly identifies valid PDF buffer header', () => {
    const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
    expect(isPdfBuffer(validHeader)).toBe(true);
  });

  it('rejects non-PDF buffer header', () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(isPdfBuffer(pngHeader)).toBe(false);

    const result = inspectPdf(pngHeader);
    expect(result.isPdf).toBe(false);
    expect(result.pageCount).toBe(0);
    expect(result.error).toContain('magic bytes');
  });

  it('extracts page count from /Count dictionary', () => {
    const pdfContent =
      '%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 15 /Kids [...] >>\nendobj\ntrailer\n%%EOF';
    const buf = new TextEncoder().encode(pdfContent);
    const result = inspectPdf(buf);
    expect(result.isPdf).toBe(true);
    expect(result.pageCount).toBe(15);
  });

  it('extracts page count by counting /Type /Page objects', () => {
    const pdfContent =
      '%PDF-1.4\n' +
      '2 0 obj << /Type /Page >> endobj\n' +
      '3 0 obj << /Type /Page >> endobj\n' +
      '4 0 obj << /Type /Page >> endobj\n' +
      'trailer\n%%EOF';
    const buf = new TextEncoder().encode(pdfContent);
    const result = inspectPdf(buf);
    expect(result.isPdf).toBe(true);
    expect(result.pageCount).toBe(3);
  });

  it('defaults safely to 1 page if valid PDF header exists but count cannot be parsed', () => {
    const minimalPdf = '%PDF-1.4\nminimal valid content\n%%EOF';
    const buf = new TextEncoder().encode(minimalPdf);
    const result = inspectPdf(buf);
    expect(result.isPdf).toBe(true);
    expect(result.pageCount).toBe(1);
  });
});
