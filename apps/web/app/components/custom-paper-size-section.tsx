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
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="text-base font-semibold text-slate-900 mb-1">Paper Sizes & Custom Formats</h3>
      <p className="text-xs text-slate-500 mb-3">
        Standard print sizes are auto-supported. Add specialized roll or poster dimensions
        on-demand.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {standardSizes.map((s) => (
          <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {s.name} ({s.widthMm}×{s.heightMm}mm)
          </span>
        ))}
        {customSizes.map((c) => (
          <span
            key={c.id}
            className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 flex items-center gap-1"
          >
            ★ {c.name} ({c.width}×{c.height}
            {c.unit})
            <button
              type="button"
              onClick={() => handleDelete(c.id)}
              className="text-sky-700 font-bold hover:text-red-600"
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
