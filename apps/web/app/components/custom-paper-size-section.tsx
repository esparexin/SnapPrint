'use client';

import React, { useState } from 'react';
import { CustomPaperSize, StandardPaperSizeDefinition } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';
import { createCustomPaperSize, deleteCustomPaperSize } from '../../src/printer-capability-client';

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
      onRefreshSizes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom size');
    } finally {
      setSubmitting(false);
    }
  };

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
        Paper Sizes & Custom Formats
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 12px' }}>
        Standard print sizes are auto-supported. Add specialized roll or poster dimensions on-demand.
      </p>

      {error && <div style={{ color: '#b91c1c', fontSize: '0.8125rem', marginBottom: '8px' }}>{error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {standardSizes.map((s) => (
          <span key={s.id} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155' }}>
            {s.name} ({s.widthMm}×{s.heightMm}mm)
          </span>
        ))}
        {customSizes.map((c) => (
          <span key={c.id} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ★ {c.name} ({c.width}×{c.height}{c.unit})
            <button type="button" onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0369a1', fontWeight: 700, padding: 0 }}>×</button>
          </span>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
        <div style={{ flex: '2 1 120px' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Format Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 12x18 Matte Poster" style={{ width: '100%', minHeight: '44px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} required />
        </div>
        <div style={{ flex: '1 1 60px' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Width</label>
          <input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="12" style={{ width: '100%', minHeight: '44px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} required />
        </div>
        <div style={{ flex: '1 1 60px' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Height</label>
          <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="18" style={{ width: '100%', minHeight: '44px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} required />
        </div>
        <div style={{ flex: '1 1 60px' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as 'in' | 'mm')} style={{ width: '100%', minHeight: '44px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', backgroundColor: '#ffffff' }}>
            <option value="in">inches (in)</option>
            <option value="mm">millimeters (mm)</option>
          </select>
        </div>
        <div style={{ flex: '2 1 120px' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Physical Printer</label>
          <select value={printerId} onChange={(e) => setPrinterId(e.target.value)} style={{ width: '100%', minHeight: '44px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', backgroundColor: '#ffffff' }}>
            {printers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <button type="submit" disabled={submitting || printers.length === 0} style={{ minHeight: '44px', padding: '0 16px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
          {submitting ? 'Adding...' : '+ Add Size'}
        </button>
      </form>
    </div>
  );
}
