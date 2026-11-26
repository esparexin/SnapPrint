'use client';

import React from 'react';
import { CustomPaperSize, StandardPaperSizeDefinition } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';
import { deleteCustomPaperSize } from '../../src/printer-capability-client';
import { CustomPaperSizeForm } from './custom-paper-size-form';

interface CustomPaperSizeSectionProps {
  studioId: string;
  printers: StudioPrinter[];
  standardSizes: StandardPaperSizeDefinition[];
  customSizes: CustomPaperSize[];
  onRefreshSizes: () => void;
}

export function CustomPaperSizeSection({
  studioId,
  printers,
  standardSizes,
  customSizes,
  onRefreshSizes,
}: CustomPaperSizeSectionProps) {
  const handleDelete = async (id: string) => {
    try {
      await deleteCustomPaperSize(studioId, id);
      onRefreshSizes();
    } catch {
      // Ignored
    }
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
        Paper Sizes &amp; Custom Formats
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
        Standard print sizes are auto-supported. Add specialized roll or poster dimensions
        on-demand.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {standardSizes.map((s) => (
          <span
            key={s.id}
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
            }}
          >
            {s.name} ({s.widthMm}×{s.heightMm}mm)
          </span>
        ))}
        {customSizes.map((c) => (
          <span
            key={c.id}
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ★ {c.name} ({c.width}×{c.height}
            {c.unit})
            <button
              type="button"
              onClick={() => handleDelete(c.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0369a1',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '14px',
              }}
              aria-label={`Delete custom size ${c.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <CustomPaperSizeForm studioId={studioId} printers={printers} onSuccess={onRefreshSizes} />
    </div>
  );
}
