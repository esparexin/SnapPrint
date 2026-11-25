'use client';

import React, { useState } from 'react';
import { PaperSize, StudioPrintRatesContract } from '@snapprint/contracts';
import { DEFAULT_DOCUMENT_PRINT_RATES, PAPER_DIMENSIONS } from '@snapprint/domain';
import { ShopPricingPreviewCard } from './shop-pricing-preview-card';
import { ShopRateInputsGrid } from './shop-rate-inputs-grid';

export interface ShopPrintRatesFieldsProps {
  printRates: StudioPrintRatesContract;
  supportedPaperSizes?: PaperSize[];
  supportsColor?: boolean;
  supportsBlackAndWhite?: boolean;
  onChange: (rates: StudioPrintRatesContract) => void;
}

const ALL_SIZES: PaperSize[] = ['A4', 'A3', 'A5', 'legal', 'letter'];

export function ShopPrintRatesFields({
  printRates,
  supportedPaperSizes,
  supportsColor = true,
  supportsBlackAndWhite = true,
  onChange,
}: ShopPrintRatesFieldsProps) {
  const configured = Object.keys(printRates).filter((k): k is PaperSize =>
    ALL_SIZES.includes(k as PaperSize)
  );
  const activeSizes: PaperSize[] =
    supportedPaperSizes && supportedPaperSizes.length > 0
      ? supportedPaperSizes
      : configured.length > 0
        ? configured
        : ['A4'];

  const [selectedSize, setSelectedSize] = useState<PaperSize>(activeSizes[0] || 'A4');
  const currentSize = activeSizes.includes(selectedSize) ? selectedSize : activeSizes[0] || 'A4';

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
      [currentSize]: {
        ...currentSizeRates,
        [mode]: { ...modeRates, [side]: minor },
      },
    });
  };

  const dim = PAPER_DIMENSIONS[currentSize];

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

      {/* Paper Size Selector Tabs */}
      <div role="tablist" aria-label="Supported Paper Sizes" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {activeSizes.map((size) => {
          const isSelected = size === currentSize;
          const sDim = PAPER_DIMENSIONS[size];
          return (
            <button
              key={size}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedSize(size)}
              style={{
                minHeight: '44px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                color: isSelected ? '#0369a1' : '#334155',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span>{size.toUpperCase()}</span>
              {sDim && <span style={{ fontSize: '10px', color: '#64748b' }}>{sDim.widthMm}×{sDim.heightMm}mm</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{currentSize.toUpperCase()} Rates</span>
        {dim && <span style={{ fontSize: '11px', color: '#64748b' }}>{dim.widthMm} × {dim.heightMm} mm ({dim.widthInches}&quot; × {dim.heightInches}&quot;)</span>}
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
        bwRates={currentSizeRates.black_and_white}
        colorRates={currentSizeRates.color}
        supportsColor={supportsColor}
        supportsBw={supportsBlackAndWhite}
      />
    </div>
  );
}
