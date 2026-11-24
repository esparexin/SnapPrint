'use client';

import React from 'react';
import { ColorMode, PaperSize, PrintSides, StudioPrintRatesContract } from '@snapprint/contracts';
import { DEFAULT_RATES, formatRupees } from './print-rate-card';

interface DocumentRateSelectorProps {
  colorMode: ColorMode;
  sides: PrintSides;
  paperSize: PaperSize;
  printRates?: StudioPrintRatesContract;
  isSinglePage: boolean;
  onSelect: (colorMode: ColorMode, sides: PrintSides) => void;
}

const baseBoxStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '8px',
  textAlign: 'left',
  minHeight: '44px',
  width: '100%',
};

function getBoxStyle(isSelected: boolean, isDisabled = false, isColorGroup = false): React.CSSProperties {
  if (isDisabled) {
    return {
      ...baseBoxStyle,
      border: '1px dashed #cbd5e1',
      backgroundColor: '#f8fafc',
      opacity: 0.55,
      cursor: 'not-allowed',
    };
  }
  if (isSelected) {
    return {
      ...baseBoxStyle,
      border: isColorGroup ? '2px solid #c026d3' : '2px solid #0284c7',
      backgroundColor: isColorGroup ? '#fdf4ff' : '#f0f9ff',
      cursor: 'pointer',
      boxShadow: isColorGroup
        ? '0 1px 3px rgba(192, 38, 211, 0.2)'
        : '0 1px 3px rgba(2, 132, 199, 0.2)',
    };
  }
  return {
    ...baseBoxStyle,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  };
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
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
        Print Mode & Color
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Black & White Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚫</span> Black & White
          </div>
          <button
            type="button"
            onClick={() => onSelect('black_and_white', 'single_sided')}
            style={getBoxStyle(isBwSingle, false, false)}
          >
            <div style={{ fontSize: '12px', fontWeight: isBwSingle ? 700 : 500, color: isBwSingle ? '#0369a1' : '#1e293b' }}>
              Single-sided
            </div>
            <div style={{ fontSize: '11px', color: isBwSingle ? '#0284c7' : '#64748b' }}>
              <strong>{formatRupees(bw.singleSidedMinor)}</strong>/page
            </div>
          </button>
          <button
            type="button"
            disabled={isSinglePage}
            onClick={() => onSelect('black_and_white', 'double_sided')}
            style={getBoxStyle(isBwDouble, isSinglePage, false)}
          >
            <div style={{ fontSize: '12px', fontWeight: isBwDouble ? 700 : 500, color: isBwDouble ? '#0369a1' : '#1e293b' }}>
              Back-to-Back
            </div>
            <div style={{ fontSize: '11px', color: isBwDouble ? '#0284c7' : '#64748b' }}>
              {isSinglePage ? '1-page doc' : <><strong>{formatRupees(bw.doubleSidedMinor)}</strong>/sheet</>}
            </div>
          </button>
        </div>

        {/* Full Color Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#86198f', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🌈</span> Full Color
          </div>
          <button
            type="button"
            onClick={() => onSelect('color', 'single_sided')}
            style={getBoxStyle(isColorSingle, false, true)}
          >
            <div style={{ fontSize: '12px', fontWeight: isColorSingle ? 700 : 500, color: isColorSingle ? '#701a75' : '#1e293b' }}>
              Single-sided
            </div>
            <div style={{ fontSize: '11px', color: isColorSingle ? '#86198f' : '#64748b' }}>
              <strong>{formatRupees(color.singleSidedMinor)}</strong>/page
            </div>
          </button>
          <button
            type="button"
            disabled={isSinglePage}
            onClick={() => onSelect('color', 'double_sided')}
            style={getBoxStyle(isColorDouble, isSinglePage, true)}
          >
            <div style={{ fontSize: '12px', fontWeight: isColorDouble ? 700 : 500, color: isColorDouble ? '#701a75' : '#1e293b' }}>
              Back-to-Back
            </div>
            <div style={{ fontSize: '11px', color: isColorDouble ? '#86198f' : '#64748b' }}>
              {isSinglePage ? '1-page doc' : <><strong>{formatRupees(color.doubleSidedMinor)}</strong>/sheet</>}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
