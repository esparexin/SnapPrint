'use client';

import React from 'react';
import { QuoteItemBreakdown } from '@snapprint/contracts';

interface OrderItemsBreakdownProps {
  items: QuoteItemBreakdown[];
}

export function OrderItemsBreakdown({ items }: OrderItemsBreakdownProps) {
  return (
    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.filename}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {item.paperSize.toUpperCase()} · {item.colorMode === 'color' ? 'Color' : 'B&W'} ·{' '}
              {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'} · {item.sheetsCount} sheets ×{' '}
              {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
            </div>
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            ₹{(item.subtotalMinor / 100).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
