'use client';

import React, { useState } from 'react';
import { StudioPrinter } from '../../src/printer-client';
import { createCustomPaperSize } from '../../src/printer-capability-client';

interface CustomPaperSizeFormProps {
  studioId: string;
  printers: StudioPrinter[];
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  padding: '0 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '2px',
};

export function CustomPaperSizeForm({ studioId, printers, onSuccess }: CustomPaperSizeFormProps) {
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
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom size');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleAdd}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'flex-end',
        backgroundColor: '#f8fafc',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      {error && <div style={{ width: '100%', color: '#b91c1c', fontSize: '12px' }}>{error}</div>}
      <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
        <label style={labelStyle}>Format Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 12x18 Poster"
          style={inputStyle}
          required
        />
      </div>
      {[
        { l: 'Width', v: width, s: setWidth, p: '12' },
        { l: 'Height', v: height, s: setHeight, p: '18' },
      ].map((f) => (
        <div key={f.l} style={{ width: '64px' }}>
          <label style={labelStyle}>{f.l}</label>
          <input
            type="number"
            step="0.1"
            value={f.v}
            onChange={(e) => f.s(e.target.value)}
            placeholder={f.p}
            style={inputStyle}
            required
          />
        </div>
      ))}
      <div style={{ width: '76px' }}>
        <label style={labelStyle}>Unit</label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as 'in' | 'mm')}
          style={inputStyle}
        >
          <option value="in">in</option>
          <option value="mm">mm</option>
        </select>
      </div>
      <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
        <label style={labelStyle}>Physical Printer</label>
        <select value={printerId} onChange={(e) => setPrinterId(e.target.value)} style={inputStyle}>
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
        style={{
          minHeight: '44px',
          padding: '0 16px',
          borderRadius: '6px',
          backgroundColor: '#0284c7',
          color: '#fff',
          fontWeight: 600,
          fontSize: '12px',
          border: 'none',
          cursor: submitting || printers.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Adding...' : '+ Add Size'}
      </button>
    </form>
  );
}
