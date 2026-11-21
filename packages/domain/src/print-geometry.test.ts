import { describe, expect, it } from 'vitest';
import { calculateFitGeometry, PAPER_DIMENSIONS } from './print-geometry.js';

describe('Print Geometry & Fit Calculations', () => {
  it('has valid physical dimensions for standard paper sizes', () => {
    expect(PAPER_DIMENSIONS.A4.widthMm).toBe(210);
    expect(PAPER_DIMENSIONS.A4.heightMm).toBe(297);
    expect(PAPER_DIMENSIONS.A3.widthMm).toBe(297);
    expect(PAPER_DIMENSIONS.A3.heightMm).toBe(420);
  });

  it('calculates fit-to-page without aspect ratio distortion', () => {
    // 1000 x 1414 px (approx A4 aspect ratio)
    const fit = calculateFitGeometry(1000, 1414, 'A4', 'portrait');
    expect(fit.paperSize).toBe('A4');
    expect(fit.orientation).toBe('portrait');
    expect(fit.effectiveWidthMm).toBeLessThanOrEqual(210);
    expect(fit.effectiveHeightMm).toBeLessThanOrEqual(297);
  });

  it('adapts orientation when auto is specified', () => {
    // Landscape source (1920 x 1080)
    const fit = calculateFitGeometry(1920, 1080, 'A4', 'auto');
    expect(fit.orientation).toBe('landscape');
    expect(fit.paperWidthMm).toBe(297);
    expect(fit.paperHeightMm).toBe(210);
  });
});
