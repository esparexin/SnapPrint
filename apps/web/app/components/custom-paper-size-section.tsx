'use client';

import React, { useState } from 'react';
import { CustomPaperSize, PaperSize, StandardPaperSizeDefinition } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';
import { deleteCustomPaperSize } from '../../src/printer-capability-client';
import { updateStudioProfile } from '../../src/studio-client';
import { CustomPaperSizeForm } from './custom-paper-size-form';

interface CustomPaperSizeSectionProps {
  studioId: string;
  printers: StudioPrinter[];
  standardSizes: StandardPaperSizeDefinition[];
  customSizes: CustomPaperSize[];
  enabledSizes?: string[];
  onRefreshSizes: () => void;
}

export function CustomPaperSizeSection({
  studioId,
  printers,
  standardSizes,
  customSizes,
  enabledSizes,
  onRefreshSizes,
}: CustomPaperSizeSectionProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomPaperSize(studioId, id);
      onRefreshSizes();
    } catch {
      // Ignored
    }
  };

  const handleToggleStandardSize = async (sizeId: string) => {
    const current = enabledSizes && enabledSizes.length > 0 ? enabledSizes : ['A4'];
    let next: string[];
    if (current.includes(sizeId)) {
      if (current.length <= 1) return;
      next = current.filter((s) => s !== sizeId);
    } else {
      next = [...current, sizeId];
    }
    setBusyId(sizeId);
    try {
      await updateStudioProfile(studioId, {
        capabilities: { supportedPaperSizes: next as PaperSize[] },
      });
      onRefreshSizes();
    } catch {
      // Ignored
    } finally {
      setBusyId(null);
    }
  };

  const activeSet = new Set(enabledSizes ?? ['A4']);

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
        Paper Sizes &amp; Custom Formats
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
        Click any paper size to enable or disable it for customers. At least one size must remain
        active.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {standardSizes.map((s) => {
          const active = activeSet.has(s.id);
          const busy = busyId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="switch"
              aria-checked={active}
              disabled={busy}
              onClick={() => handleToggleStandardSize(s.id)}
              title={active ? `Disable ${s.name}` : `Enable ${s.name}`}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                minHeight: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: busy ? 'wait' : 'pointer',
                fontWeight: active ? 600 : 400,
                backgroundColor: active ? '#e0f2fe' : '#f8fafc',
                color: active ? '#0369a1' : '#64748b',
                border: active ? '1px solid #7dd3fc' : '1px dashed #cbd5e1',
              }}
            >
              <span>{active ? '✓' : '✕'}</span>
              <span>
                {s.name} ({s.widthMm}×{s.heightMm}mm)
              </span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>{active ? 'Active' : 'Off'}</span>
            </button>
          );
        })}
        {customSizes.map((c) => (
          <span
            key={c.id}
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              minHeight: '36px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #7dd3fc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
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
