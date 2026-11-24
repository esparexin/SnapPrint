'use client';

import React from 'react';
import { StudioPrintRatesContract } from '@snapprint/contracts';

interface PrintRateCardProps {
  printRates?: StudioPrintRatesContract;
}

const DEFAULT_RATES = {
  A4: {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
  },
};

function formatRupees(paise?: number): string {
  if (typeof paise !== 'number') return '0';
  const rs = paise / 100;
  return Number.isInteger(rs) ? `₹${rs}` : `₹${rs.toFixed(2)}`;
}

export function PrintRateCard({ printRates }: PrintRateCardProps) {
  const a4Rates = printRates?.A4 || DEFAULT_RATES.A4;
  const bw = a4Rates.black_and_white || DEFAULT_RATES.A4.black_and_white;
  const color = a4Rates.color || DEFAULT_RATES.A4.color;

  return (
    <section
      role="region"
      aria-label="Shop Print & Xerox Rates"
      style={{
        marginBottom: '20px',
        padding: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px' }}>🖨️</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            A4 Print & Xerox Rates
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#0284c7',
            backgroundColor: '#f0f9ff',
            padding: '2px 8px',
            borderRadius: '9999px',
            border: '1px solid #bae6fd',
          }}
        >
          Live Shop Pricing
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Black & White Card */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '6px',
            }}
          >
            <span>⚫</span> Black & White
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>
            Single-sided:{' '}
            <strong style={{ color: '#0f172a' }}>{formatRupees(bw.singleSidedMinor)}</strong>/page
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            Back-to-Back:{' '}
            <strong style={{ color: '#0f172a' }}>{formatRupees(bw.doubleSidedMinor)}</strong>/sheet
          </div>
        </div>

        {/* Color Card */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#fdf4ff',
            border: '1px solid #f5d0fe',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#86198f',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '6px',
            }}
          >
            <span>🌈</span> Full Color
          </div>
          <div style={{ fontSize: '12px', color: '#701a75', marginBottom: '2px' }}>
            Single-sided:{' '}
            <strong style={{ color: '#4a044e' }}>{formatRupees(color.singleSidedMinor)}</strong>
            /page
          </div>
          <div style={{ fontSize: '12px', color: '#701a75' }}>
            Back-to-Back:{' '}
            <strong style={{ color: '#4a044e' }}>{formatRupees(color.doubleSidedMinor)}</strong>
            /sheet
          </div>
        </div>
      </div>
    </section>
  );
}
