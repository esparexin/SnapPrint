/**
 * Pure domain logic for inspecting PDF files, verifying magic bytes, and extracting page count.
 * Zero external dependencies.
 */

export interface PdfInspectionResult {
  isPdf: boolean;
  pageCount: number;
  error?: string;
}

const MAX_PDF_PAGES = 500;

export function isPdfBuffer(buf: Uint8Array): boolean {
  if (buf.length < 5) return false;
  // %PDF- magic bytes: 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d
  );
}

export function inspectPdf(buf: Uint8Array): PdfInspectionResult {
  if (!isPdfBuffer(buf)) {
    return {
      isPdf: false,
      pageCount: 0,
      error: 'File does not start with valid PDF magic bytes (%PDF-).',
    };
  }

  // Convert buffer to latin1 string for safe, fast regex matching
  // Scan chunks to prevent large allocations
  const maxScanBytes = Math.min(buf.length, 10 * 1024 * 1024);
  const text = new TextDecoder('latin1').decode(buf.subarray(0, maxScanBytes));

  // 1. Try finding /Count in the document catalog pages dictionary
  // e.g. /Type /Pages ... /Count 12
  const countMatches = text.match(/\/Count\s+(\d+)/g);
  let bestCount = 0;

  if (countMatches) {
    for (const match of countMatches) {
      const numMatch = match.match(/\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        if (val > bestCount && val <= MAX_PDF_PAGES) {
          bestCount = val;
        }
      }
    }
  }

  // 2. Fallback: Count /Type /Page (excluding /Type /Pages)
  if (bestCount === 0) {
    const pageTypeMatches = text.match(/\/Type\s*\/Page\b/g);
    if (pageTypeMatches && pageTypeMatches.length > 0) {
      bestCount = Math.min(pageTypeMatches.length, MAX_PDF_PAGES);
    }
  }

  // If a valid PDF header is present but page structure couldn't be parsed,
  // default safely to 1 page.
  const finalCount = bestCount > 0 ? bestCount : 1;

  if (finalCount > MAX_PDF_PAGES) {
    return {
      isPdf: true,
      pageCount: finalCount,
      error: `PDF page count (${finalCount}) exceeds maximum allowed limit of ${MAX_PDF_PAGES} pages.`,
    };
  }

  return {
    isPdf: true,
    pageCount: finalCount,
  };
}
