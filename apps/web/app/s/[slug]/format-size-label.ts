import { CustomPaperSizeSummary, PaperSize } from '@snapprint/contracts';

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
    return size;
  }
  return size.toUpperCase();
}
