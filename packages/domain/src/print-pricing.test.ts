import { describe, expect, it } from 'vitest';
import { calculateItemQuote, calculateOrderQuote } from './print-pricing.js';

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

  it('calculates double-sided (duplex) A4 color quotation correctly', () => {
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

    // 5 pages duplex = 3 sheets
    expect(item.selectedPagesCount).toBe(5);
    expect(item.sheetsCount).toBe(3);
    expect(item.unitPriceMinor).toBe(1800); // 1800 paise = ₹18.00 per sheet
    expect(item.subtotalMinor).toBe(3 * 1800); // 5400 paise = ₹54.00
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
});
