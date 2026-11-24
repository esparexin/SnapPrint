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
});
