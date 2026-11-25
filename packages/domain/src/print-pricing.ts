import {
  ColorMode,
  DocumentPrintConfig,
  PaperSize,
  QuoteItemBreakdown,
  QuoteResponse,
} from '@snapprint/contracts';
import { parsePageRange } from './page-range.js';

/**
 * Standard Xerox & Document Print Shop Rates in minor units (paise, 100 paise = 1 INR).
 * Single sided: rate per sheet/page printed.
 * Double sided (duplex): rate per physical sheet (2 pages front/back).
 */
export interface SheetPricingRate {
  singleSidedMinor: number;
  doubleSidedMinor: number;
}

export type PricingMatrix = Record<PaperSize, Record<ColorMode, SheetPricingRate>>;

export const DEFAULT_DOCUMENT_PRINT_RATES: PricingMatrix = {
  A4: {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 }, // ₹2.00 / ₹3.00
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 }, // ₹10.00 / ₹18.00
  },
  A3: {
    black_and_white: { singleSidedMinor: 500, doubleSidedMinor: 800 }, // ₹5.00 / ₹8.00
    color: { singleSidedMinor: 2000, doubleSidedMinor: 3500 }, // ₹20.00 / ₹35.00
  },
  A5: {
    black_and_white: { singleSidedMinor: 150, doubleSidedMinor: 250 }, // ₹1.50 / ₹2.50
    color: { singleSidedMinor: 800, doubleSidedMinor: 1400 }, // ₹8.00 / ₹14.00
  },
  legal: {
    black_and_white: { singleSidedMinor: 250, doubleSidedMinor: 400 }, // ₹2.50 / ₹4.00
    color: { singleSidedMinor: 1200, doubleSidedMinor: 2200 }, // ₹12.00 / ₹22.00
  },
  letter: {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 }, // ₹2.00 / ₹3.00
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 }, // ₹10.00 / ₹18.00
  },
};

export interface CalculateItemQuoteParams {
  config: DocumentPrintConfig;
  filename: string;
  documentPageCount: number;
  rates?: PricingMatrix;
}

export function calculateItemQuote({
  config,
  filename,
  documentPageCount,
  rates = DEFAULT_DOCUMENT_PRINT_RATES,
}: CalculateItemQuoteParams): QuoteItemBreakdown {
  const rangeResult = parsePageRange(config.pageSelection, documentPageCount);
  if (!rangeResult.valid) {
    throw new Error(rangeResult.error || 'Invalid page selection range.');
  }

  const selectedPagesCount = rangeResult.pages.length;
  const isDuplex = config.sides === 'double_sided';
  const sheetsCount = isDuplex ? Math.ceil(selectedPagesCount / 2) : selectedPagesCount;

  const defaultPaperRates =
    DEFAULT_DOCUMENT_PRINT_RATES[config.paperSize] || DEFAULT_DOCUMENT_PRINT_RATES.A4;
  const paperRates = rates?.[config.paperSize] || defaultPaperRates;
  const defaultColorRates =
    defaultPaperRates[config.colorMode] || defaultPaperRates.black_and_white;
  const colorRates =
    paperRates?.[config.colorMode] || defaultColorRates;

  const singleSidedRate = colorRates.singleSidedMinor ?? defaultColorRates.singleSidedMinor;
  const doubleSidedRate = colorRates.doubleSidedMinor ?? defaultColorRates.doubleSidedMinor;
  const unitPriceMinor = isDuplex ? doubleSidedRate : singleSidedRate;

  const copies = Math.max(1, Math.min(100, config.copies));
  let costPerCopyMinor: number;
  if (!isDuplex) {
    costPerCopyMinor = selectedPagesCount * singleSidedRate;
  } else {
    const fullSheets = Math.floor(selectedPagesCount / 2);
    const hasOddPage = selectedPagesCount % 2 === 1;
    costPerCopyMinor = fullSheets * doubleSidedRate + (hasOddPage ? singleSidedRate : 0);
  }
  const subtotalMinor = costPerCopyMinor * copies;

  return {
    assetId: config.assetId,
    filename,
    paperSize: config.paperSize,
    colorMode: config.colorMode,
    sides: config.sides,
    orientation: config.orientation,
    scaling: config.scaling,
    pageSelection: config.pageSelection,
    copies,
    documentPageCount,
    selectedPagesCount,
    sheetsCount,
    unitPriceMinor,
    subtotalMinor,
  };
}

export interface CalculateOrderQuoteParams {
  items: Array<{
    config: DocumentPrintConfig;
    filename: string;
    documentPageCount: number;
  }>;
  rates?: PricingMatrix;
}

export function calculateOrderQuote({
  items,
  rates = DEFAULT_DOCUMENT_PRINT_RATES,
}: CalculateOrderQuoteParams): QuoteResponse {
  if (items.length === 0) {
    throw new Error('Order must contain at least one document item.');
  }

  const itemBreakdowns: QuoteItemBreakdown[] = [];
  let totalSheets = 0;
  let totalAmountMinor = 0;

  for (const item of items) {
    const breakdown = calculateItemQuote({
      config: item.config,
      filename: item.filename,
      documentPageCount: item.documentPageCount,
      rates,
    });
    itemBreakdowns.push(breakdown);
    totalSheets += breakdown.sheetsCount * breakdown.copies;
    totalAmountMinor += breakdown.subtotalMinor;
  }

  return {
    items: itemBreakdowns,
    totalSheets,
    totalAmountMinor,
    currency: 'INR',
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates per-copy cost following Issue #16 & #81 billing rules:
 * - Single-sided is charged per printed page.
 * - Double-sided is charged per physical sheet (2 pages per sheet).
 * - For an odd page count, the odd final page is charged at single-sided rate.
 */
export function calculatePrintCostPerCopyMinor(
  pagesCount: number,
  isDuplex: boolean,
  singleSidedRate: number,
  doubleSidedRate: number
): number {
  if (pagesCount <= 0) return 0;
  if (!isDuplex) {
    return pagesCount * singleSidedRate;
  }
  const fullDuplexSheets = Math.floor(pagesCount / 2);
  const hasOddPage = pagesCount % 2 === 1;
  return fullDuplexSheets * doubleSidedRate + (hasOddPage ? singleSidedRate : 0);
}

export interface IncompletePricingDetail {
  paperSize: PaperSize;
  colorMode: ColorMode;
  missingSides: ('singleSidedMinor' | 'doubleSidedMinor')[];
}

/**
 * Validates whether a studio's print rate configuration covers all supported paper sizes
 * and active color modes.
 */
export function validateShopPricingMatrix(
  supportedPaperSizes: PaperSize[],
  supportsColor: boolean,
  supportsBlackAndWhite: boolean,
  rates?: Partial<Record<string, Record<string, Partial<SheetPricingRate>>>>
): { isComplete: boolean; missing: IncompletePricingDetail[] } {
  const missing: IncompletePricingDetail[] = [];
  const colorModes: ColorMode[] = [];
  if (supportsBlackAndWhite) colorModes.push('black_and_white');
  if (supportsColor) colorModes.push('color');

  for (const size of supportedPaperSizes) {
    const sizeRates = rates?.[size];
    for (const mode of colorModes) {
      const modeRate = sizeRates?.[mode];
      const missingSides: ('singleSidedMinor' | 'doubleSidedMinor')[] = [];
      if (typeof modeRate?.singleSidedMinor !== 'number' || modeRate.singleSidedMinor < 0) {
        missingSides.push('singleSidedMinor');
      }
      if (typeof modeRate?.doubleSidedMinor !== 'number' || modeRate.doubleSidedMinor < 0) {
        missingSides.push('doubleSidedMinor');
      }
      if (missingSides.length > 0) {
        missing.push({ paperSize: size, colorMode: mode, missingSides });
      }
    }
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}
