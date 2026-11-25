'use client';

import React from 'react';
import { SheetPricingRate } from '@snapprint/domain';

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
      {supportsBw && (
        <>
          <div
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
              ⚫ B&amp;W Single (₹/page)
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              style={inputStyle}
              value={(bwRates?.singleSidedMinor ?? 200) / 100}
              onChange={(e) => onUpdateBwRate('singleSidedMinor', parseFloat(e.target.value) || 0)}
              aria-label="Black and white single-sided rate in Rupees"
            />
          </div>
          <div
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
              ⚫ B&amp;W Duplex (₹/sheet)
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              style={inputStyle}
              value={(bwRates?.doubleSidedMinor ?? 300) / 100}
              onChange={(e) => onUpdateBwRate('doubleSidedMinor', parseFloat(e.target.value) || 0)}
              aria-label="Black and white back-to-back duplex rate in Rupees"
            />
          </div>
        </>
      )}

      {supportsColor && (
        <>
          <div
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
              🌈 Color Single (₹/page)
            </span>
            <input
              type="number"
              step="1"
              min="0"
              style={inputStyle}
              value={(colorRates?.singleSidedMinor ?? 1000) / 100}
              onChange={(e) =>
                onUpdateColorRate('singleSidedMinor', parseFloat(e.target.value) || 0)
              }
              aria-label="Color single-sided rate in Rupees"
            />
          </div>
          <div
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
              🌈 Color Duplex (₹/sheet)
            </span>
            <input
              type="number"
              step="1"
              min="0"
              style={inputStyle}
              value={(colorRates?.doubleSidedMinor ?? 1800) / 100}
              onChange={(e) =>
                onUpdateColorRate('doubleSidedMinor', parseFloat(e.target.value) || 0)
              }
              aria-label="Color back-to-back duplex rate in Rupees"
            />
          </div>
        </>
      )}
    </div>
  );
}
