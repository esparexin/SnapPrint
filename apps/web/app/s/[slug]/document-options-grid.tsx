'use client';

import React from 'react';
import {
  ColorMode,
  DocumentPrintConfig,
  PaperSize,
  PrintOrientation,
  PrintSides,
} from '@snapprint/contracts';

interface DocumentOptionsGridProps {
  config: DocumentPrintConfig;
  pageCount?: number;
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

export function DocumentOptionsGrid({ config, pageCount, onUpdate }: DocumentOptionsGridProps) {
  const isSinglePage = pageCount === 1;

  return (
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
        <label style={labelStyle}>Color</label>
        <select
          value={config.colorMode}
          onChange={(e) => onUpdate({ ...config, colorMode: e.target.value as ColorMode })}
          style={selectStyle}
        >
          <option value="black_and_white">B&W (₹)</option>
          <option value="color">Color (₹₹)</option>
        </select>
      </div>

      <div style={{ minWidth: 0 }}>
        <label style={labelStyle}>Sides</label>
        <select
          value={isSinglePage ? 'single_sided' : config.sides}
          disabled={isSinglePage}
          onChange={(e) => onUpdate({ ...config, sides: e.target.value as PrintSides })}
          style={{
            ...selectStyle,
            backgroundColor: isSinglePage ? '#f1f5f9' : '#ffffff',
            cursor: isSinglePage ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="single_sided">Single-Sided</option>
          <option value="double_sided">Double-Sided (Duplex)</option>
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
  );
}
