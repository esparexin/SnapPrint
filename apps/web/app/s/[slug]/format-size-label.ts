import { CustomPaperSizeSummary, PaperSize } from '@snapprint/contracts';

export const PAPER_SIZE_DISPLAY_NAMES: Record<string, [string, string]> = {
  A4: ['A4 (Standard)', 'A4'],
  A3: ['A3 (Large)', 'A3'],
  A5: ['A5 (Compact)', 'A5'],
  A6: ['A6', 'A6'],
  legal: ['Legal', 'Legal'],
  letter: ['Letter', 'Letter'],
  '4x6': ['4 × 6″ Photo', '4×6″'],
  '5x7': ['5 × 7″ Photo', '5×7″'],
};

export function getPaperSizeButtonLabel(
  size: string,
  isSingleSize: boolean,
  customMap?: Map<string, string>
): string {
  return customMap?.get(size) || PAPER_SIZE_DISPLAY_NAMES[size]?.[isSingleSize ? 0 : 1] || size;
}

/**
 * Resolves a paper size string or ID to a human-readable display label.
 * Custom paper sizes (`cps_*`) are looked up against active custom size summaries.
 * Standard sizes return uppercase format (e.g. "A4", "A3", "LEGAL").
 */
export function resolveFormatLabel(
  size: PaperSize | string,
  customSizes?: readonly CustomPaperSizeSummary[]
): string {
  if (size.startsWith('cps_')) {
    const match = customSizes?.find((c) => c.id === size);
    if (match) return match.name;
    const raw = size.slice(4).trim();
    if (!raw || /^[0-9a-f]{8,}$/i.test(raw)) return 'Custom Size';
    return raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return size.toUpperCase();
}
