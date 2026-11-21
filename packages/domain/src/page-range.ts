/**
 * Pure domain logic for parsing and validating document print page ranges.
 * Examples of valid inputs: 'all', '1-5', '1,3,5', '1-4,8,10-12'.
 * Zero external dependencies.
 */

export interface PageRangeResult {
  valid: boolean;
  pages: number[];
  error?: string;
}

export function parsePageRange(rangeStr: string, totalPages: number): PageRangeResult {
  if (totalPages <= 0) {
    return { valid: false, pages: [], error: 'Total pages must be greater than 0.' };
  }

  const trimmed = rangeStr.trim().toLowerCase();
  if (!trimmed || trimmed === 'all') {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return { valid: true, pages };
  }

  // Reject unsupported characters (only digits, commas, hyphens, and spaces allowed)
  if (!/^[\d\s,-]+$/.test(trimmed)) {
    return {
      valid: false,
      pages: [],
      error:
        'Page range contains invalid characters. Use numbers, commas, and hyphens (e.g. 1-5, 8).',
    };
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, pages: [], error: 'Page selection cannot be empty.' };
  }

  if (parts.length > 50) {
    return {
      valid: false,
      pages: [],
      error: 'Page selection has too many range segments (max 50).',
    };
  }

  const selectedSet = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const sides = part.split('-').map((s) => s.trim());
      if (sides.length !== 2 || !sides[0] || !sides[1]) {
        return { valid: false, pages: [], error: `Invalid range format: '${part}'.` };
      }
      const start = parseInt(sides[0], 10);
      const end = parseInt(sides[1], 10);

      if (isNaN(start) || isNaN(end)) {
        return { valid: false, pages: [], error: `Malformed numbers in range: '${part}'.` };
      }
      if (start <= 0 || end <= 0) {
        return { valid: false, pages: [], error: 'Page numbers must be 1 or greater.' };
      }
      if (start > end) {
        return {
          valid: false,
          pages: [],
          error: `Reversed page range: '${part}' (${start} > ${end}).`,
        };
      }
      if (end > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${end} exceeds total document page count of ${totalPages}.`,
        };
      }
      for (let i = start; i <= end; i++) {
        selectedSet.add(i);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum)) {
        return { valid: false, pages: [], error: `Invalid page number: '${part}'.` };
      }
      if (pageNum <= 0) {
        return { valid: false, pages: [], error: 'Page numbers must be 1 or greater.' };
      }
      if (pageNum > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${pageNum} exceeds total document page count of ${totalPages}.`,
        };
      }
      selectedSet.add(pageNum);
    }
  }

  const sortedPages = Array.from(selectedSet).sort((a, b) => a - b);
  if (sortedPages.length === 0) {
    return { valid: false, pages: [], error: 'No valid pages selected.' };
  }

  return { valid: true, pages: sortedPages };
}
