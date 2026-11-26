'use client';

import React from 'react';
import { PaperSize } from '@snapprint/contracts';
import { calculatePrintCostPerCopyMinor, SheetPricingRate } from '@snapprint/domain';

interface ShopPricingPreviewCardProps {
  paperSize: PaperSize;
  sizeLabel?: string;
  bwRates?: SheetPricingRate;
  colorRates?: SheetPricingRate;
  supportsColor?: boolean;
  supportsBw?: boolean;
}

const formatRs = (minor: number) => {
  const rs = minor / 100;
  return Number.isInteger(rs) ? `₹${rs}` : `₹${rs.toFixed(2)}`;
};

export function ShopPricingPreviewCard({
  paperSize,
  sizeLabel,
  bwRates,
  colorRates,
  supportsColor = true,
  supportsBw = true,
}: ShopPricingPreviewCardProps) {
  const bwSingle = bwRates?.singleSidedMinor ?? 0;
  const bwDouble = bwRates?.doubleSidedMinor ?? 0;
  const colSingle = colorRates?.singleSidedMinor ?? 0;
  const colDouble = colorRates?.doubleSidedMinor ?? 0;

  const isBwIncomplete = supportsBw && (bwSingle <= 0 || bwDouble <= 0);
  const isColorIncomplete = supportsColor && (colSingle <= 0 || colDouble <= 0);
  const isIncomplete = isBwIncomplete || isColorIncomplete;

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
          👁️ Customer Quote Preview ({sizeLabel || paperSize.toUpperCase()})
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isIncomplete ? '#fef2f2' : '#ecfdf5',
            color: isIncomplete ? '#b91c1c' : '#047857',
            fontWeight: 600,
          }}
        >
          {isIncomplete ? '⚠️ Rates Incomplete' : '✓ Complete'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          fontSize: '11px',
        }}
      >
        {supportsBw && (
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
            }}
          >
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ⚫ B&amp;W Sample Quotes
            </div>
            <div>
              1 page: <strong>{formatRs(bwSingle)}</strong>
            </div>
            <div>
              2 pages duplex: <strong>{formatRs(bwDouble)}</strong>
            </div>
            <div>
              3 pages duplex:{' '}
              <strong>
                {formatRs(calculatePrintCostPerCopyMinor(3, true, bwSingle, bwDouble))}
              </strong>
            </div>
          </div>
        )}

        {supportsColor && (
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #f0abfc',
            }}
          >
            <div style={{ fontWeight: 700, color: '#86198f', marginBottom: '4px' }}>
              🌈 Color Sample Quotes
            </div>
            <div>
              1 page: <strong>{formatRs(colSingle)}</strong>
            </div>
            <div>
              2 pages duplex: <strong>{formatRs(colDouble)}</strong>
            </div>
            <div>
              3 pages duplex:{' '}
              <strong>
                {formatRs(calculatePrintCostPerCopyMinor(3, true, colSingle, colDouble))}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', lineHeight: '1.4' }}>
        ℹ️ <strong>Billing Semantics (#16):</strong> Single-sided is charged per printed page;
        double-sided is charged per physical sheet (2 pages); an odd final page is charged at the
        single-sided rate.
      </div>
    </div>
  );
}
