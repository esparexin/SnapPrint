'use client';

import React, { useState } from 'react';
import { CustomPaperSize, PaperSize, StudioPrintRatesContract } from '@snapprint/contracts';
import { DEFAULT_DOCUMENT_PRINT_RATES, PAPER_DIMENSIONS } from '@snapprint/domain';
import { getTabBtnStyle } from './operator-portal-styles';
import { ShopPricingPreviewCard } from './shop-pricing-preview-card';
import { ShopRateInputsGrid } from './shop-rate-inputs-grid';

export interface ShopPrintRatesFieldsProps {
  printRates: StudioPrintRatesContract;
  supportedPaperSizes?: PaperSize[];
  customSizes?: CustomPaperSize[];
  supportsColor?: boolean;
  supportsBlackAndWhite?: boolean;
  onChange: (rates: StudioPrintRatesContract) => void;
}

const ALL_SIZES: PaperSize[] = ['A4', 'A3', 'A5', 'A6', 'legal', 'letter', '4x6', '5x7'];

export function ShopPrintRatesFields({
  printRates,
  supportedPaperSizes,
  customSizes,
  supportsColor = true,
  supportsBlackAndWhite = true,
  onChange,
}: ShopPrintRatesFieldsProps) {
  const configured: PaperSize[] = Object.keys(printRates).filter((k): k is PaperSize =>
    ALL_SIZES.includes(k as PaperSize)
  );
  const activeSizes: PaperSize[] = supportedPaperSizes?.length ? supportedPaperSizes : configured;
  const [selectedSize, setSelectedSize] = useState<PaperSize>(activeSizes[0] ?? 'A4');
  const currentSize: PaperSize = activeSizes.includes(selectedSize)
    ? selectedSize
    : (activeSizes[0] ?? 'A4');

  const defaultRates = DEFAULT_DOCUMENT_PRINT_RATES[currentSize] || DEFAULT_DOCUMENT_PRINT_RATES.A4;
  const currentSizeRates = printRates[currentSize] || defaultRates;

  const updateRate = (
    mode: 'black_and_white' | 'color',
    side: 'singleSidedMinor' | 'doubleSidedMinor',
    rupees: number
  ) => {
    const minor = Math.max(0, Math.round(rupees * 100));
    const modeRates = currentSizeRates[mode] || defaultRates[mode];
    onChange({
      ...printRates,
      [currentSize]: { ...currentSizeRates, [mode]: { ...modeRates, [side]: minor } },
    });
  };

  const dim = PAPER_DIMENSIONS[currentSize];
  const curCustom = customSizes?.find((c) => c.id === currentSize);
  const curDimText = curCustom
    ? `${curCustom.width} × ${curCustom.height} ${curCustom.unit}`
    : dim
      ? `${dim.widthMm} × ${dim.heightMm} mm`
      : undefined;

  return (
    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
          🖨️ Paper Sizes &amp; Print Rates
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Configure rates for each supported paper size. Rates apply to live customer quotes.
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Supported Paper Sizes"
        style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}
      >
        {activeSizes.map((size) => {
          const cust = customSizes?.find((c) => c.id === size);
          const label = cust ? cust.name : size.toUpperCase();
          const dText = cust
            ? `${cust.width}×${cust.height}${cust.unit}`
            : PAPER_DIMENSIONS[size]
              ? `${PAPER_DIMENSIONS[size].widthMm}×${PAPER_DIMENSIONS[size].heightMm}mm`
              : undefined;
          return (
            <button
              key={size}
              type="button"
              role="tab"
              aria-selected={size === currentSize}
              onClick={() => setSelectedSize(size)}
              style={getTabBtnStyle(size === currentSize)}
            >
              <span>{label}</span>
              {dText && <span style={{ fontSize: '10px', color: '#64748b' }}>{dText}</span>}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '6px 0',
          borderBottom: '1px dashed #e2e8f0',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
          {curCustom ? curCustom.name : currentSize.toUpperCase()} Rates
        </span>
        {curDimText && (
          <span style={{ fontSize: '11px', color: '#64748b' }}>Dimensions: {curDimText}</span>
        )}
      </div>

      <ShopRateInputsGrid
        bwRates={currentSizeRates.black_and_white}
        colorRates={currentSizeRates.color}
        supportsColor={supportsColor}
        supportsBw={supportsBlackAndWhite}
        onUpdateBwRate={(side, rs) => updateRate('black_and_white', side, rs)}
        onUpdateColorRate={(side, rs) => updateRate('color', side, rs)}
      />

      <ShopPricingPreviewCard
        paperSize={currentSize}
        sizeLabel={curCustom?.name}
        bwRates={currentSizeRates.black_and_white}
        colorRates={currentSizeRates.color}
        supportsColor={supportsColor}
        supportsBw={supportsBlackAndWhite}
      />
    </div>
  );
}
