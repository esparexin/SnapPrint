'use client';

import React from 'react';
import {
  ColorMode,
  DocumentPrintConfig,
  PaperSize,
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

  function handleRateSelect(colorMode: ColorMode, sides: PrintSides) {
    onUpdate({
      ...config,
      colorMode,
      sides: isSinglePage ? 'single_sided' : sides,
    });
  }

  return (
    <div>
      <DocumentRateSelector
        colorMode={config.colorMode}
        sides={config.sides}
        paperSize={config.paperSize}
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
            value={config.paperSize}
            onChange={(e) => onUpdate({ ...config, paperSize: e.target.value as PaperSize })}
            style={selectStyle}
          >
            <option value="A4">A4 (Standard)</option>
            <option value="A3">A3 (Large)</option>
            <option value="A5">A5 (Compact)</option>
            <option value="legal">Legal</option>
            <option value="letter">Letter</option>
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

