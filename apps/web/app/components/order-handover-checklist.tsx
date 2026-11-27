'use client';

import React from 'react';
import { QuoteItemBreakdown } from '@snapprint/contracts';
import { resolveFormatLabel } from '../s/[slug]/format-size-label';

interface OrderHandoverChecklistProps {
  items: QuoteItemBreakdown[];
}

export function OrderHandoverChecklist({ items }: OrderHandoverChecklistProps) {
  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px',
        margin: '8px 0',
        maxHeight: '180px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#64748b',
          marginBottom: '6px',
          textTransform: 'uppercase',
        }}
      >
        Order Documents Checklist ({items.length})
      </div>
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            fontSize: '13px',
            padding: '5px 0',
            borderBottom: idx < items.length - 1 ? '1px solid #e2e8f0' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.filename}</span>
          <span style={{ color: '#475569' }}>
            {resolveFormatLabel(it.paperSize)} · {it.colorMode === 'color' ? 'Color' : 'B&W'} ·{' '}
            {it.sheetsCount} sheets × {it.copies}
          </span>
        </div>
      ))}
    </div>
  );
}
