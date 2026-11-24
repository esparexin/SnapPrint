'use client';

import React, { useMemo } from 'react';
import {
  ColorMode,
  DocumentPrintConfig,
  PaperSize,
  PaperSizes,
  PrintOrientation,
  PrintSides,
  StudioPrintRatesContract,
} from '@snapprint/contracts';
import { DocumentRateSelector } from './document-rate-selector';

interface DocumentOptionsGridProps {
  config: DocumentPrintConfig;
  pageCount?: number;
  printRates?: StudioPrintRatesContract;
  onUpdate: (updated: DocumentPrintConfig) => void;
}

const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  A4: 'A4 (Standard)',
  A3: 'A3 (Large)',
  A5: 'A5 (Compact)',
  legal: 'Legal',
  letter: 'Letter',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '3px',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  backgroundColor: '#ffffff',
};

export function DocumentOptionsGrid({
  config,
  pageCount,
  printRates,
  onUpdate,
}: DocumentOptionsGridProps) {
  const isSinglePage = pageCount === 1;

  // Filter available paper sizes strictly to those configured in studio.printRates
  const availableSizes = useMemo(() => {
    const configured = Object.keys(printRates || {}).filter((k) =>
      PaperSizes.includes(k as PaperSize)
    ) as PaperSize[];
    return configured.length > 0 ? configured : (['A4'] as PaperSize[]);
  }, [printRates]);

  const effectivePaperSize = availableSizes.includes(config.paperSize)
    ? config.paperSize
    : availableSizes[0];

  function handleRateSelect(colorMode: ColorMode, sides: PrintSides) {
    onUpdate({
      ...config,
      paperSize: effectivePaperSize,
      colorMode,
      sides: isSinglePage ? 'single_sided' : sides,
    });
  }

  function handlePaperSizeChange(newSize: PaperSize) {
    onUpdate({
      ...config,
      paperSize: newSize,
    });
  }

  return (
    <div>
      <DocumentRateSelector
        colorMode={config.colorMode}
        sides={config.sides}
        paperSize={effectivePaperSize}
        printRates={printRates}
        isSinglePage={isSinglePage}
        onSelect={handleRateSelect}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Paper Size</label>
          <select
            value={effectivePaperSize}
            onChange={(e) => handlePaperSizeChange(e.target.value as PaperSize)}
            style={selectStyle}
          >
            {availableSizes.map((size) => (
              <option key={size} value={size}>
                {PAPER_SIZE_LABELS[size] || size}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Orientation</label>
          <select
            value={config.orientation}
            onChange={(e) => onUpdate({ ...config, orientation: e.target.value as PrintOrientation })}
            style={selectStyle}
          >
            <option value="portrait">▯ Portrait</option>
            <option value="landscape">▭ Landscape</option>
            <option value="auto">⟳ Auto</option>
          </select>
        </div>
      </div>
    </div>
  );
}

