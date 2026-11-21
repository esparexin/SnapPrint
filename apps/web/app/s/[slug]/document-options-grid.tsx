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
  onUpdate: (updated: DocumentPrintConfig) => void;
}

export function DocumentOptionsGrid({ config, onUpdate }: DocumentOptionsGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        marginBottom: '14px',
      }}
    >
      {/* Paper Size */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
          }}
        >
          Paper Size
        </label>
        <select
          value={config.paperSize}
          onChange={(e) => onUpdate({ ...config, paperSize: e.target.value as PaperSize })}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
          }}
        >
          <option value="A4">A4 (Standard)</option>
          <option value="A3">A3 (Large)</option>
          <option value="A5">A5 (Compact)</option>
          <option value="legal">Legal</option>
          <option value="letter">Letter</option>
        </select>
      </div>

      {/* Color Mode */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
          }}
        >
          Color
        </label>
        <select
          value={config.colorMode}
          onChange={(e) => onUpdate({ ...config, colorMode: e.target.value as ColorMode })}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
          }}
        >
          <option value="black_and_white">Black & White (₹)</option>
          <option value="color">Color</option>
        </select>
      </div>

      {/* Sides / Duplex */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
          }}
        >
          Sides
        </label>
        <select
          value={config.sides}
          onChange={(e) => onUpdate({ ...config, sides: e.target.value as PrintSides })}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
          }}
        >
          <option value="single_sided">Single-Sided</option>
          <option value="double_sided">Double-Sided (Duplex)</option>
        </select>
      </div>

      {/* Orientation */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '4px',
          }}
        >
          Orientation
        </label>
        <select
          value={config.orientation}
          onChange={(e) => onUpdate({ ...config, orientation: e.target.value as PrintOrientation })}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
          }}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
          <option value="auto">Auto</option>
        </select>
      </div>
    </div>
  );
}
