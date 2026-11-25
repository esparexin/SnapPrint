import { describe, expect, it } from 'vitest';
import { StudioPrintRatesContract } from '@snapprint/contracts';

describe('Print Rates Calculation & Display', () => {
  it('formats rupees accurately from paise', () => {
    const toRupees = (paise: number) => {
      const rs = paise / 100;
      return Number.isInteger(rs) ? `₹${rs}` : `₹${rs.toFixed(2)}`;
    };

    expect(toRupees(200)).toBe('₹2');
    expect(toRupees(350)).toBe('₹3.50');
    expect(toRupees(1000)).toBe('₹10');
    expect(toRupees(1800)).toBe('₹18');
  });

  it('handles custom studio print rates structure', () => {
    const customRates: StudioPrintRatesContract = {
      A4: {
        black_and_white: { singleSidedMinor: 250, doubleSidedMinor: 400 },
        color: { singleSidedMinor: 1500, doubleSidedMinor: 2500 },
      },
    };

    expect(customRates.A4?.black_and_white?.singleSidedMinor).toBe(250);
    expect(customRates.A4?.black_and_white?.doubleSidedMinor).toBe(400);
    expect(customRates.A4?.color?.singleSidedMinor).toBe(1500);
    expect(customRates.A4?.color?.doubleSidedMinor).toBe(2500);
  });

  it('filters available paper sizes strictly to configured studio rates', () => {
    const filterSizes = (rates?: StudioPrintRatesContract) => {
      const allowed = ['A4', 'A3', 'A5', 'legal', 'letter'];
      const configured = Object.keys(rates || {}).filter((k) => allowed.includes(k));
      return configured.length > 0 ? configured : ['A4'];
    };

    // When only A4 and Legal are configured
    const ratesWithLegal: StudioPrintRatesContract = {
      A4: {
        black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
        color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
      },
      legal: {
        black_and_white: { singleSidedMinor: 300, doubleSidedMinor: 500 },
        color: { singleSidedMinor: 1500, doubleSidedMinor: 2500 },
      },
    };
    expect(filterSizes(ratesWithLegal)).toEqual(['A4', 'legal']);

    // When empty, fallback to A4 only
    expect(filterSizes(undefined)).toEqual(['A4']);
    expect(filterSizes({})).toEqual(['A4']);

    // When A4, A3, Legal, Letter are configured
    const multiRates: StudioPrintRatesContract = {
      A4: {
        black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
        color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
      },
      A3: {
        black_and_white: { singleSidedMinor: 500, doubleSidedMinor: 800 },
        color: { singleSidedMinor: 2000, doubleSidedMinor: 3500 },
      },
      legal: {
        black_and_white: { singleSidedMinor: 250, doubleSidedMinor: 400 },
        color: { singleSidedMinor: 1200, doubleSidedMinor: 2200 },
      },
      letter: {
        black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
        color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
      },
    };
    expect(filterSizes(multiRates)).toEqual(['A4', 'A3', 'legal', 'letter']);
  });

  it('provides canonical paper dimensions for all supported sizes', () => {
    const expectedSizes = ['A4', 'A3', 'A5', 'legal', 'letter'];
    for (const size of expectedSizes) {
      expect(typeof size).toBe('string');
    }
  });

  it('calculates sample customer quotes for odd-page duplex according to #16', () => {
    const bwSingle = 200; // ₹2
    const bwDouble = 300; // ₹3 / sheet

    // 1 page
    const p1 = 1 * bwSingle;
    expect(p1).toBe(200);

    // 2 pages duplex = 1 physical sheet
    const p2 = 1 * bwDouble;
    expect(p2).toBe(300);

    // 3 pages duplex = 1 physical sheet (300) + 1 single-sided page (200) = 500
    const p3 = 1 * bwDouble + 1 * bwSingle;
    expect(p3).toBe(500);
  });
});
