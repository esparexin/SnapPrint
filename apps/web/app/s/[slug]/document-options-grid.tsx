'use client';

import React, { useMemo } from 'react';
import {
  ColorMode,
  DocumentPrintConfig,
  PaperSize,
  PaperSizes,
  PrintSides,
  StudioPrintRatesContract,
  StudioPublicCapabilities,
} from '@snapprint/contracts';
import { DocumentRateSelector } from './document-rate-selector';
import { AutoOrientIcon, LandscapeIcon, PortraitIcon } from './storefront-icons';

interface DocumentOptionsGridProps {
  config: DocumentPrintConfig;
  pageCount?: number;
  printRates?: StudioPrintRatesContract;
  capabilities?: StudioPublicCapabilities;
  onUpdate: (updated: DocumentPrintConfig) => void;
}

const SIZES: Record<string, [string, string]> = {
  A4: ['A4 (Standard)', 'A4'],
  A3: ['A3 (Large)', 'A3'],
  A5: ['A5 (Compact)', 'A5'],
  A6: ['A6', 'A6'],
  legal: ['Legal', 'Legal'],
  letter: ['Letter', 'Letter'],
  '4x6': ['4 × 6″ Photo', '4×6″'],
  '5x7': ['5 × 7″ Photo', '5×7″'],
};

const ORIENTATION_OPTIONS = [
  { value: 'portrait' as const, label: 'Portrait', icon: <PortraitIcon size={12} /> },
  { value: 'landscape' as const, label: 'Landscape', icon: <LandscapeIcon size={12} /> },
  { value: 'auto' as const, label: 'Auto', icon: <AutoOrientIcon size={12} /> },
];

export function DocumentOptionsGrid({
  config,
  pageCount,
  printRates,
  capabilities,
  onUpdate,
}: DocumentOptionsGridProps) {
  const isSinglePage = pageCount === 1;

  // Primary: printer hardware sizes reported by backend capabilities.
  // Secondary: sizes operator configured rates for.
  const availableSizes = useMemo(() => {
    const valid = (s: string[]) =>
      s.filter((k) => PaperSizes.includes(k as (typeof PaperSizes)[number])) as PaperSize[];
    const caps = valid(capabilities?.supportedPaperSizes ?? []);
    return caps.length > 0 ? caps : valid(Object.keys(printRates || {}));
  }, [printRates, capabilities]);

  const effectivePaperSize = availableSizes.includes(config.paperSize)
    ? config.paperSize
    : availableSizes[0];

  function handleRateSelect(colorMode: ColorMode, sides: PrintSides) {
    if (!effectivePaperSize) return;
    onUpdate({
      ...config,
      paperSize: effectivePaperSize,
      colorMode,
      sides: isSinglePage ? 'single_sided' : sides,
    });
  }

  if (availableSizes.length === 0) {
    return (
      <div className="sf-field-label" style={{ color: '#94a3b8', padding: '8px 0' }}>
        No print sizes configured. Contact the shop for assistance.
      </div>
    );
  }

  return (
    <div>
      <DocumentRateSelector
        colorMode={config.colorMode}
        sides={config.sides}
        paperSize={effectivePaperSize!}
        printRates={printRates}
        capabilities={capabilities}
        isSinglePage={isSinglePage}
        onSelect={handleRateSelect}
      />
      <div style={{ marginBottom: '10px' }}>
        <div className="sf-field-label">Paper Size</div>
        <div role="radiogroup" aria-label="Paper Size" className="sf-segmented-group">
          {availableSizes.map((size) => {
            const active = effectivePaperSize === size;
            const label = SIZES[size]?.[availableSizes.length === 1 ? 0 : 1] || size;
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onUpdate({ ...config, paperSize: size })}
                className={active ? 'sf-seg-btn sf-seg-btn--active' : 'sf-seg-btn'}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <div className="sf-field-label">Orientation</div>
        <div role="radiogroup" aria-label="Orientation" className="sf-orientation-group">
          {ORIENTATION_OPTIONS.map((opt) => {
            const active = config.orientation === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onUpdate({ ...config, orientation: opt.value })}
                className={active ? 'sf-seg-btn sf-seg-btn--active' : 'sf-seg-btn'}
                style={{ width: '100%' }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
