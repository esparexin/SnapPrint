'use client';

import React from 'react';
import { StudioPrintRatesContract } from '@snapprint/contracts';

export interface ShopPrintRatesFieldsProps {
  printRates: StudioPrintRatesContract;
  onChange: (rates: StudioPrintRatesContract) => void;
}

export function ShopPrintRatesFields({ printRates, onChange }: ShopPrintRatesFieldsProps) {
  const a4 = printRates.A4 || {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
  };

  const updateRate = (
    mode: 'black_and_white' | 'color',
    side: 'singleSidedMinor' | 'doubleSidedMinor',
    rupees: number
  ) => {
    const minor = Math.max(0, Math.round(rupees * 100));
    onChange({
      ...printRates,
      A4: {
        ...a4,
        [mode]: {
          ...a4[mode],
          [side]: minor,
        },
      },
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: '16px', // Prevents iOS mobile auto-zoom
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    boxSizing: 'border-box',
    marginTop: '4px',
  };

  const fields = [
    {
      label: '⚫ B&W Single Sided',
      mode: 'black_and_white' as const,
      side: 'singleSidedMinor' as const,
      step: '0.5',
      val: (a4.black_and_white?.singleSidedMinor ?? 200) / 100,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#334155',
    },
    {
      label: '⚫ B&W Back-to-Back',
      mode: 'black_and_white' as const,
      side: 'doubleSidedMinor' as const,
      step: '0.5',
      val: (a4.black_and_white?.doubleSidedMinor ?? 300) / 100,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#334155',
    },
    {
      label: '🌈 Color Single Sided',
      mode: 'color' as const,
      side: 'singleSidedMinor' as const,
      step: '1',
      val: (a4.color?.singleSidedMinor ?? 1000) / 100,
      bg: '#fdf4ff',
      border: '#f5d0fe',
      color: '#86198f',
    },
    {
      label: '🌈 Color Back-to-Back',
      mode: 'color' as const,
      side: 'doubleSidedMinor' as const,
      step: '1',
      val: (a4.color?.doubleSidedMinor ?? 1800) / 100,
      bg: '#fdf4ff',
      border: '#f5d0fe',
      color: '#86198f',
    },
  ];

  return (
    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
          🖨️ Document Print & Xerox Rates (A4)
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Set your counter rates per page/sheet in Rupees (₹). Live quotes on /s/[slug] update
          automatically.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        {fields.map((f) => (
          <div
            key={f.label}
            style={{
              padding: '10px',
              backgroundColor: f.bg,
              borderRadius: '6px',
              border: `1px solid ${f.border}`,
            }}
          >
            <span
              style={{ fontSize: '0.75rem', fontWeight: 700, color: f.color, display: 'block' }}
            >
              {f.label}
            </span>
            <input
              type="number"
              step={f.step}
              min="0"
              style={inputStyle}
              value={f.val}
              onChange={(e) => updateRate(f.mode, f.side, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
