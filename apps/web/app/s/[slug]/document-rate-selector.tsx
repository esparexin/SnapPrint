'use client';

import React from 'react';
import {
  ColorMode, PaperSize, PrintSides,
  StudioPrintRatesContract, StudioPublicCapabilities,
} from '@snapprint/contracts';
import { DocumentRateOptionButton } from './document-rate-button';
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

  const isDuplexSupported = Boolean(
    capabilities?.supportsDuplex &&
      (capabilities.supportedDuplexSizes?.length === 0 ||
        capabilities.supportedDuplexSizes?.includes(paperSize))
  );

  const isBwSingle = colorMode === 'black_and_white' && (sides === 'single_sided' || isSinglePage);
  const isBwDouble =
    colorMode === 'black_and_white' && sides === 'double_sided' && !isSinglePage && isDuplexSupported;
  const isColorSingle = colorMode === 'color' && (sides === 'single_sided' || isSinglePage);
  const isColorDouble =
    colorMode === 'color' && sides === 'double_sided' && !isSinglePage && isDuplexSupported;

  function renderDuplexSublabel(rateMinor: number) {
    if (isSinglePage) return '1-page doc';
    if (!isDuplexSupported) return 'Simplex only';
    return (
      <>
        <span style={{ fontWeight: 600 }}>{formatRupees(rateMinor)}</span>/sheet
      </>
    );
  }

  return (
    <div style={{ marginBottom: '10px' }}>
      <div className="sf-field-label">Print Mode &amp; Color</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                backgroundColor: '#1e293b',
                display: 'inline-block',
              }}
            />
            Black &amp; White
          </div>
          <DocumentRateOptionButton
            label="Single-sided"
            sublabel={
              <>
                <span style={{ fontWeight: 600 }}>{formatRupees(bw.singleSidedMinor)}</span>/page
              </>
            }
            isSelected={isBwSingle}
            onClick={() => onSelect('black_and_white', 'single_sided')}
          />
          <DocumentRateOptionButton
            label="Back-to-Back"
            sublabel={renderDuplexSublabel(bw.doubleSidedMinor)}
            isSelected={isBwDouble}
            isDisabled={isSinglePage || !isDuplexSupported}
            onClick={() => onSelect('black_and_white', 'double_sided')}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)',
                display: 'inline-block',
              }}
            />
            Color
          </div>
          <DocumentRateOptionButton
            label="Single-sided"
            sublabel={
              <>
                <span style={{ fontWeight: 600 }}>{formatRupees(color.singleSidedMinor)}</span>/page
              </>
            }
            isSelected={isColorSingle}
            isColor
            onClick={() => onSelect('color', 'single_sided')}
          />
          <DocumentRateOptionButton
            label="Back-to-Back"
            sublabel={renderDuplexSublabel(color.doubleSidedMinor)}
            isSelected={isColorDouble}
            isDisabled={isSinglePage || !isDuplexSupported}
            isColor
            onClick={() => onSelect('color', 'double_sided')}
          />
        </div>
      </div>
    </div>
  );
}
