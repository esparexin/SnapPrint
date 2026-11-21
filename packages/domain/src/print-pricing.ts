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

  const paperRates = rates[config.paperSize] || rates.A4;
  const colorRates = paperRates[config.colorMode] || paperRates.black_and_white;
  const unitPriceMinor = isDuplex ? colorRates.doubleSidedMinor : colorRates.singleSidedMinor;

  const copies = Math.max(1, Math.min(100, config.copies));
  const subtotalMinor = sheetsCount * unitPriceMinor * copies;

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
