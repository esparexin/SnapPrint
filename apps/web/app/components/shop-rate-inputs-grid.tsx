'use client';

import React from 'react';
import { SheetPricingRate } from '@snapprint/domain';
import { ControlledNumericInput } from './controlled-numeric-input';

interface ShopRateInputsGridProps {
  bwRates?: SheetPricingRate;
  colorRates?: SheetPricingRate;
  supportsColor?: boolean;
  supportsBw?: boolean;
  onUpdateBwRate: (side: 'singleSidedMinor' | 'doubleSidedMinor', rupees: number) => void;
  onUpdateColorRate: (side: 'singleSidedMinor' | 'doubleSidedMinor', rupees: number) => void;
}

export function ShopRateInputsGrid({
  bwRates,
  colorRates,
  supportsColor = true,
  supportsBw = true,
  onUpdateBwRate,
  onUpdateColorRate,
}: ShopRateInputsGridProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '16px', // Prevents iOS mobile auto-zoom
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    boxSizing: 'border-box',
    marginTop: '4px',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        marginTop: '8px',
      }}
    >
      {supportsBw &&
        [
          {
            label: '⚫ B&W Single (₹/page)',
            side: 'singleSidedMinor' as const,
            def: 200,
            aria: 'Black and white single-sided rate in Rupees',
          },
          {
            label: '⚫ B&W Duplex (₹/sheet)',
            side: 'doubleSidedMinor' as const,
            def: 300,
            aria: 'Black and white back-to-back duplex rate in Rupees',
          },
        ].map((f) => (
          <div
            key={f.side}
            style={{
              padding: '10px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <span
              style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block' }}
            >
              {f.label}
            </span>
            <ControlledNumericInput
              allowDecimals
              min={0}
              style={inputStyle}
              value={(bwRates?.[f.side] ?? f.def) / 100}
              onChange={(val) => onUpdateBwRate(f.side, typeof val === 'number' ? val : 0)}
              aria-label={f.aria}
            />
          </div>
        ))}

      {supportsColor &&
        [
          {
            label: '🌈 Color Single (₹/page)',
            side: 'singleSidedMinor' as const,
            def: 1000,
            aria: 'Color single-sided rate in Rupees',
          },
          {
            label: '🌈 Color Duplex (₹/sheet)',
            side: 'doubleSidedMinor' as const,
            def: 1800,
            aria: 'Color back-to-back duplex rate in Rupees',
          },
        ].map((f) => (
          <div
            key={f.side}
            style={{
              padding: '10px',
              backgroundColor: '#fdf4ff',
              borderRadius: '6px',
              border: '1px solid #f5d0fe',
            }}
          >
            <span
              style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86198f', display: 'block' }}
            >
              {f.label}
            </span>
            <ControlledNumericInput
              allowDecimals
              min={0}
              style={inputStyle}
              value={(colorRates?.[f.side] ?? f.def) / 100}
              onChange={(val) => onUpdateColorRate(f.side, typeof val === 'number' ? val : 0)}
              aria-label={f.aria}
            />
          </div>
        ))}
    </div>
  );
}
