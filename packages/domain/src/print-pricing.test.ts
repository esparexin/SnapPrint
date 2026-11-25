import { describe, expect, it } from 'vitest';
import {
  calculateItemQuote,
  calculateOrderQuote,
  calculatePrintCostPerCopyMinor,
  validateShopPricingMatrix,
} from './print-pricing.js';

describe('Document Print Pricing Logic', () => {
  it('calculates single-sided A4 B&W quotation correctly', () => {
    const item = calculateItemQuote({
      config: {
        assetId: 'asset_1234567890abcdef',
        paperSize: 'A4',
        colorMode: 'black_and_white',
        sides: 'single_sided',
        orientation: 'portrait',
        scaling: 'fit_to_page',
        pageSelection: '1-5',
        copies: 2,
      },
      filename: 'document.pdf',
      documentPageCount: 10,
    });

    expect(item.selectedPagesCount).toBe(5);
    expect(item.sheetsCount).toBe(5);
    expect(item.unitPriceMinor).toBe(200); // 200 paise = ₹2.00
    expect(item.subtotalMinor).toBe(5 * 200 * 2); // 2000 paise = ₹20.00
  });

  it('calculates double-sided (duplex) A4 color quotation with odd-page rule correctly', () => {
    const item = calculateItemQuote({
      config: {
        assetId: 'asset_1234567890abcdef',
        paperSize: 'A4',
        colorMode: 'color',
        sides: 'double_sided',
        orientation: 'portrait',
        scaling: 'fit_to_page',
        pageSelection: 'all', // 5 pages
        copies: 1,
      },
      filename: 'presentation.pdf',
      documentPageCount: 5,
    });

    // 5 pages duplex = 3 physical sheets:
    // 4 pages = 2 double-sided sheets @ ₹18.00 (1800 paise)
    // 1 odd page = 1 single-sided page @ ₹10.00 (1000 paise)
    // Total = (2 * 1800) + (1 * 1000) = 4600 paise = ₹46.00
    expect(item.selectedPagesCount).toBe(5);
    expect(item.sheetsCount).toBe(3);
    expect(item.unitPriceMinor).toBe(1800); // 1800 paise = ₹18.00 per sheet
    expect(item.subtotalMinor).toBe(2 * 1800 + 1000); // 4600 paise = ₹46.00
  });

  it('calculates double-sided (duplex) with even page count correctly', () => {
    const item = calculateItemQuote({
      config: {
        assetId: 'asset_even_pages_123',
        paperSize: 'A4',
        colorMode: 'color',
        sides: 'double_sided',
        orientation: 'portrait',
        scaling: 'fit_to_page',
        pageSelection: '1-4', // 4 pages
        copies: 2,
      },
      filename: 'report.pdf',
      documentPageCount: 10,
    });

    // 4 pages duplex = 2 sheets @ 1800 * 2 copies = 7200 paise = ₹72.00
    expect(item.selectedPagesCount).toBe(4);
    expect(item.sheetsCount).toBe(2);
    expect(item.subtotalMinor).toBe(2 * 1800 * 2);
  });

  it('charges 1-page document with duplex selected at the single-sided rate', () => {
    const item = calculateItemQuote({
      config: {
        assetId: 'asset_single_page_duplex',
        paperSize: 'A4',
        colorMode: 'black_and_white',
        sides: 'double_sided',
        orientation: 'portrait',
        scaling: 'fit_to_page',
        pageSelection: '1',
        copies: 1,
      },
      filename: 'certificate.pdf',
      documentPageCount: 1,
    });

    expect(item.selectedPagesCount).toBe(1);
    expect(item.sheetsCount).toBe(1);
    expect(item.subtotalMinor).toBe(200); // 1 page * 200 paise
  });

  it('calculates order total across multiple documents', () => {
    const order = calculateOrderQuote({
      items: [
        {
          config: {
            assetId: 'asset_1',
            paperSize: 'A4',
            colorMode: 'black_and_white',
            sides: 'single_sided',
            orientation: 'portrait',
            scaling: 'fit_to_page',
            pageSelection: '1-2',
            copies: 1,
          },
          filename: 'doc1.pdf',
          documentPageCount: 2,
        },
        {
          config: {
            assetId: 'asset_2',
            paperSize: 'A3',
            colorMode: 'color',
            sides: 'single_sided',
            orientation: 'landscape',
            scaling: 'fit_to_page',
            pageSelection: 'all',
            copies: 2,
          },
          filename: 'map.pdf',
          documentPageCount: 1,
        },
      ],
    });

    // Item 1: 2 sheets * 200 = 400
    // Item 2: 1 sheet * 2000 * 2 copies = 4000
    // Total = 4400 paise (₹44.00)
    expect(order.items.length).toBe(2);
    expect(order.totalAmountMinor).toBe(4400);
    expect(order.currency).toBe('INR');
  });

  it('fails closed when given empty item list', () => {
    expect(() => calculateOrderQuote({ items: [] })).toThrow('at least one document');
  });

  it('falls back to default rates when studio pricing matrix is empty or partial', () => {
    const order = calculateOrderQuote({
      items: [
        {
          config: {
            assetId: 'asset_partial_rates_1',
            paperSize: 'A3',
            colorMode: 'color',
            sides: 'double_sided',
            orientation: 'portrait',
            scaling: 'fit_to_page',
            pageSelection: 'all',
            copies: 1,
          },
          filename: 'poster.pdf',
          documentPageCount: 2,
        },
      ],
      rates: {} as never,
    });

    expect(order.items[0].unitPriceMinor).toBe(3500);
    expect(order.totalAmountMinor).toBe(3500);
  });

  describe('calculatePrintCostPerCopyMinor', () => {
    it('calculates single-sided cost proportionally', () => {
      expect(calculatePrintCostPerCopyMinor(5, false, 200, 300)).toBe(1000);
      expect(calculatePrintCostPerCopyMinor(0, false, 200, 300)).toBe(0);
    });

    it('calculates duplex cost with odd-page rule', () => {
      // 0 pages -> 0
      expect(calculatePrintCostPerCopyMinor(0, true, 200, 300)).toBe(0);
      // 1 page -> 1 single-sided page (200)
      expect(calculatePrintCostPerCopyMinor(1, true, 200, 300)).toBe(200);
      // 2 pages -> 1 sheet (300)
      expect(calculatePrintCostPerCopyMinor(2, true, 200, 300)).toBe(300);
      // 3 pages -> 1 sheet (300) + 1 single (200) = 500
      expect(calculatePrintCostPerCopyMinor(3, true, 200, 300)).toBe(500);
      // 4 pages -> 2 sheets (600)
      expect(calculatePrintCostPerCopyMinor(4, true, 200, 300)).toBe(600);
      // 5 pages -> 2 sheets (600) + 1 single (200) = 800
      expect(calculatePrintCostPerCopyMinor(5, true, 200, 300)).toBe(800);
    });
  });

  describe('validateShopPricingMatrix', () => {
    it('returns complete for fully populated matrix', () => {
      const res = validateShopPricingMatrix(['A4', 'A3'], true, true, {
        A4: {
          black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
          color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
        },
        A3: {
          black_and_white: { singleSidedMinor: 500, doubleSidedMinor: 800 },
          color: { singleSidedMinor: 2000, doubleSidedMinor: 3500 },
        },
      });
      expect(res.isComplete).toBe(true);
      expect(res.missing).toHaveLength(0);
    });

    it('identifies missing sizes or modes', () => {
      const res = validateShopPricingMatrix(
        ['A4', 'legal'],
        false, // color not supported
        true,
        {
          A4: {
            black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
          },
          // legal is missing
        }
      );
      expect(res.isComplete).toBe(false);
      expect(res.missing).toHaveLength(1);
      expect(res.missing[0].paperSize).toBe('legal');
      expect(res.missing[0].colorMode).toBe('black_and_white');
    });
  });
});
