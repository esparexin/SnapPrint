'use client';

import React from 'react';
import { ColorMode, PaperSize, PrintSides, StudioPrintRatesContract } from '@snapprint/contracts';
import { DocumentRateOptionButton } from './document-rate-button';
import { DEFAULT_RATES, formatRupees } from './print-rate-card';

interface DocumentRateSelectorProps {
  colorMode: ColorMode;
  sides: PrintSides;
  paperSize: PaperSize;
  printRates?: StudioPrintRatesContract;
  isSinglePage: boolean;
  onSelect: (colorMode: ColorMode, sides: PrintSides) => void;
}

export function DocumentRateSelector({
  colorMode,
  sides,
  paperSize,
  printRates,
  isSinglePage,
  onSelect,
}: DocumentRateSelectorProps) {
  const paperRates = printRates?.[paperSize] || printRates?.A4 || DEFAULT_RATES.A4;
  const bw = paperRates?.black_and_white || DEFAULT_RATES.A4.black_and_white;
  const color = paperRates?.color || DEFAULT_RATES.A4.color;

  const isBwSingle = colorMode === 'black_and_white' && (sides === 'single_sided' || isSinglePage);
  const isBwDouble = colorMode === 'black_and_white' && sides === 'double_sided' && !isSinglePage;
  const isColorSingle = colorMode === 'color' && (sides === 'single_sided' || isSinglePage);
  const isColorDouble = colorMode === 'color' && sides === 'double_sided' && !isSinglePage;

  return (
    <div style={{ marginBottom: '12px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: '#475569',
          marginBottom: '6px',
        }}
      >
        Print Mode & Color
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>⚫</span> Black & White
          </div>
          <DocumentRateOptionButton
            label="Single-sided"
            sublabel={
              <>
                <strong>{formatRupees(bw.singleSidedMinor)}</strong>/page
              </>
            }
            isSelected={isBwSingle}
            onClick={() => onSelect('black_and_white', 'single_sided')}
          />
          <DocumentRateOptionButton
            label="Back-to-Back"
            sublabel={
              isSinglePage ? (
                '1-page doc'
              ) : (
                <>
                  <strong>{formatRupees(bw.doubleSidedMinor)}</strong>/sheet
                </>
              )
            }
            isSelected={isBwDouble}
            isDisabled={isSinglePage}
            onClick={() => onSelect('black_and_white', 'double_sided')}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🌈</span> Color
          </div>
          <DocumentRateOptionButton
            label="Single-sided"
            sublabel={
              <>
                <strong>{formatRupees(color.singleSidedMinor)}</strong>/page
              </>
            }
            isSelected={isColorSingle}
            isColor
            onClick={() => onSelect('color', 'single_sided')}
          />
          <DocumentRateOptionButton
            label="Back-to-Back"
            sublabel={
              isSinglePage ? (
                '1-page doc'
              ) : (
                <>
                  <strong>{formatRupees(color.doubleSidedMinor)}</strong>/sheet
                </>
              )
            }
            isSelected={isColorDouble}
            isDisabled={isSinglePage}
            isColor
            onClick={() => onSelect('color', 'double_sided')}
          />
        </div>
      </div>
    </div>
  );
}
