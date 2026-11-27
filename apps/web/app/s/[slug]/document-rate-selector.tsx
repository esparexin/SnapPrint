'use client';

import React from 'react';
import {
  ColorMode,
  PaperSize,
  PrintSides,
  StudioPrintRatesContract,
  StudioPublicCapabilities,
} from '@snapprint/contracts';
import { DocumentRateOptionButton, ModeHeader } from './document-rate-button';
import { DEFAULT_RATES, formatRupees } from './print-rate-card';

interface DocumentRateSelectorProps {
  colorMode: ColorMode;
  sides: PrintSides;
  paperSize: PaperSize;
  printRates?: StudioPrintRatesContract;
  capabilities?: StudioPublicCapabilities;
  isSinglePage: boolean;
  onSelect: (colorMode: ColorMode, sides: PrintSides) => void;
}

export function DocumentRateSelector({
  colorMode,
  sides,
  paperSize,
  printRates,
  capabilities,
  isSinglePage,
  onSelect,
}: DocumentRateSelectorProps) {
  const paperRates = printRates?.[paperSize] || printRates?.A4 || DEFAULT_RATES.A4;
  const bw = paperRates?.black_and_white || DEFAULT_RATES.A4.black_and_white;
  const color = paperRates?.color || DEFAULT_RATES.A4.color;

  const hasColorRate = Boolean(printRates?.[paperSize]?.color || printRates?.A4?.color);
  const isColorSupported = Boolean(
    capabilities ? capabilities.supportsColor && (hasColorRate || !printRates) : hasColorRate
  );

  const isDuplexSupported = Boolean(
    capabilities?.supportsDuplex &&
      (capabilities.supportedDuplexSizes?.length === 0 ||
        capabilities.supportedDuplexSizes?.includes(paperSize))
  );

  const singleSublabel = (minor: number) => (
    <>
      <span style={{ fontWeight: 600 }}>{formatRupees(minor)}</span>/page
    </>
  );

  const duplexSublabel = (minor: number) => {
    const rate = (
      <>
        <span style={{ fontWeight: 600 }}>{formatRupees(minor)}</span>/sheet
      </>
    );
    if (isSinglePage)
      return (
        <>
          {rate} · <span style={{ color: '#94a3b8' }}>1-page doc</span>
        </>
      );
    if (!isDuplexSupported)
      return (
        <>
          {rate} · <span style={{ color: '#94a3b8' }}>Simplex only</span>
        </>
      );
    return rate;
  };

  const renderModeColumn = (
    mode: ColorMode,
    label: string,
    bg: string,
    rates: { singleSidedMinor: number; doubleSidedMinor: number }
  ) => {
    const isSingle = colorMode === mode && (sides === 'single_sided' || isSinglePage);
    const isDouble =
      colorMode === mode && sides === 'double_sided' && !isSinglePage && isDuplexSupported;
    const isColorMode = mode === 'color';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        <ModeHeader label={label} bg={bg} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isColorSupported ? '1fr' : '1fr 1fr',
            gap: '6px',
          }}
        >
          <DocumentRateOptionButton
            label="Single-sided"
            sublabel={singleSublabel(rates.singleSidedMinor)}
            isSelected={isSingle}
            isColor={isColorMode}
            onClick={() => onSelect(mode, 'single_sided')}
          />
          <DocumentRateOptionButton
            label="Back-to-Back"
            sublabel={duplexSublabel(rates.doubleSidedMinor)}
            isSelected={isDouble}
            isDisabled={isSinglePage || !isDuplexSupported}
            isColor={isColorMode}
            onClick={() => onSelect(mode, 'double_sided')}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      <div className="sf-field-label">Print Mode &amp; Color</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isColorSupported ? '1fr 1fr' : '1fr',
          gap: '8px',
        }}
      >
        {renderModeColumn('black_and_white', 'Black & White', '#1e293b', bw)}
        {isColorSupported &&
          renderModeColumn(
            'color',
            'Color',
            'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)',
            color
          )}
      </div>
    </div>
  );
}
