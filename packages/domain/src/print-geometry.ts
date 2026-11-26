import { PaperSize, PrintOrientation } from '@snapprint/contracts';

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
  widthInches: number;
  heightInches: number;
}

export const PAPER_DIMENSIONS: Record<string, PhysicalDimensions> = {
  A4: { widthMm: 210, heightMm: 297, widthInches: 8.27, heightInches: 11.69 },
  A3: { widthMm: 297, heightMm: 420, widthInches: 11.69, heightInches: 16.54 },
  A5: { widthMm: 148, heightMm: 210, widthInches: 5.83, heightInches: 8.27 },
  A6: { widthMm: 105, heightMm: 148, widthInches: 4.13, heightInches: 5.83 },
  legal: { widthMm: 215.9, heightMm: 355.6, widthInches: 8.5, heightInches: 14.0 },
  letter: { widthMm: 215.9, heightMm: 279.4, widthInches: 8.5, heightInches: 11.0 },
  '4x6': { widthMm: 101.6, heightMm: 152.4, widthInches: 4.0, heightInches: 6.0 },
  '5x7': { widthMm: 127.0, heightMm: 177.8, widthInches: 5.0, heightInches: 7.0 },
};

export interface FitGeometryResult {
  paperSize: PaperSize;
  paperWidthMm: number;
  paperHeightMm: number;
  scaleFactor: number;
  effectiveWidthMm: number;
  effectiveHeightMm: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * Calculates fit-to-page geometry maintaining aspect ratio without distortion.
 */
export function calculateFitGeometry(
  sourceWidthPx: number,
  sourceHeightPx: number,
  paperSize: PaperSize = 'A4',
  desiredOrientation: PrintOrientation = 'portrait',
  customDimensions?: PhysicalDimensions
): FitGeometryResult {
  const paper = customDimensions || PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;
  let targetWidth = paper.widthMm;
  let targetHeight = paper.heightMm;

  let orientation: 'portrait' | 'landscape' =
    desiredOrientation === 'landscape' ? 'landscape' : 'portrait';

  if (desiredOrientation === 'auto') {
    orientation = sourceWidthPx > sourceHeightPx ? 'landscape' : 'portrait';
  }

  if (orientation === 'landscape') {
    targetWidth = paper.heightMm;
    targetHeight = paper.widthMm;
  }

  const widthScale = targetWidth / sourceWidthPx;
  const heightScale = targetHeight / sourceHeightPx;
  const scaleFactor = Math.min(widthScale, heightScale);

  const effectiveWidthMm = Math.round(sourceWidthPx * scaleFactor * 100) / 100;
  const effectiveHeightMm = Math.round(sourceHeightPx * scaleFactor * 100) / 100;

  return {
    paperSize,
    paperWidthMm: targetWidth,
    paperHeightMm: targetHeight,
    scaleFactor,
    effectiveWidthMm,
    effectiveHeightMm,
    orientation,
  };
}
