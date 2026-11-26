'use client';

import React, { useState } from 'react';
import { StudioPrinter } from '../../src/printer-client';
import { createCustomPaperSize } from '../../src/printer-capability-client';

interface CustomPaperSizeFormProps {
  studioId: string;
  printers: StudioPrinter[];
  onAdded: () => void;
}

export function CustomPaperSizeForm({ studioId, printers, onAdded }: CustomPaperSizeFormProps) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState<'in' | 'mm'>('in');
  const [printerId, setPrinterId] = useState(printers[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !width || !height || !printerId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCustomPaperSize(studioId, {
        name: name.trim(),
        printerId,
        width: parseFloat(width),
        height: parseFloat(height),
        unit,
      });
      setName('');
      setWidth('');
      setHeight('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom size');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleAdd}
      className="flex flex-wrap gap-2 items-end bg-slate-50 p-3 rounded-lg"
    >
      {error && <div className="w-full text-red-700 text-xs mb-1">{error}</div>}
      <div className="flex-1 min-w-[120px]">
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Format Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 12x18 Poster"
          className="w-full min-h-[44px] px-2 rounded-md border border-slate-300 text-base md:text-sm bg-white"
          required
        />
      </div>
      <div className="w-16">
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Width</label>
        <input
          type="number"
          step="0.1"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="12"
          className="w-full min-h-[44px] px-2 rounded-md border border-slate-300 text-base md:text-sm bg-white"
          required
        />
      </div>
      <div className="w-16">
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Height</label>
        <input
          type="number"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="18"
          className="w-full min-h-[44px] px-2 rounded-md border border-slate-300 text-base md:text-sm bg-white"
          required
        />
      </div>
      <div className="w-20">
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Unit</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as 'in' | 'mm')}
          className="w-full min-h-[44px] px-1 rounded-md border border-slate-300 text-base md:text-sm bg-white"
        >
          <option value="in">in</option>
          <option value="mm">mm</option>
        </select>
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
          Physical Printer
        </label>
        <select
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
          className="w-full min-h-[44px] px-2 rounded-md border border-slate-300 text-base md:text-sm bg-white"
        >
          {printers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || printers.length === 0}
        className="min-h-[44px] px-4 rounded-md bg-sky-600 text-white font-semibold text-xs hover:bg-sky-700"
      >
        {submitting ? 'Adding...' : '+ Add Size'}
      </button>
    </form>
  );
}
