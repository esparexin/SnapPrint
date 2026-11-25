'use client';

import React from 'react';
import { QuoteItemBreakdown } from '@snapprint/contracts';

interface OrderItemsBreakdownProps {
  items: QuoteItemBreakdown[];
}

export function OrderItemsBreakdown({ items }: OrderItemsBreakdownProps) {
  return (
    <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 10px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: '12.5px',
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.filename}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>
              {item.paperSize.toUpperCase()} · {item.colorMode === 'color' ? 'Color' : 'B&W'} ·{' '}
              {item.sides === 'double_sided' ? 'Duplex' : '1-Sided'} · {item.sheetsCount}{' '}
              {item.sheetsCount === 1 ? 'sheet' : 'sheets'} × {item.copies}{' '}
              {item.copies === 1 ? 'copy' : 'copies'}
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a', flexShrink: 0 }}>
            ₹{(item.subtotalMinor / 100).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
