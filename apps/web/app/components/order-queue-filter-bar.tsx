'use client';

import React from 'react';
import { OrderStatus } from '@snapprint/contracts';

interface OrderQueueFilterBarProps {
  statusFilter: OrderStatus | 'all';
  onSelectStatus: (status: OrderStatus | 'all') => void;
}

const filterOptions = [
  'all',
  'submitted',
  'processing',
  'ready',
  'completed',
  'cancelled',
] as const;

export function OrderQueueFilterBar({ statusFilter, onSelectStatus }: OrderQueueFilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        padding: '8px 16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        overflowX: 'auto',
        flexWrap: 'wrap',
      }}
    >
      {filterOptions.map((st) => (
        <button
          key={st}
          type="button"
          onClick={() => onSelectStatus(st)}
          style={{
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: 600,
            border: '1px solid',
            borderColor: statusFilter === st ? '#0284c7' : '#cbd5e1',
            backgroundColor: statusFilter === st ? '#e0f2fe' : '#ffffff',
            color: statusFilter === st ? '#0369a1' : '#475569',
            cursor: 'pointer',
          }}
        >
          {st === 'all' ? 'All Orders' : st.charAt(0).toUpperCase() + st.slice(1)}
        </button>
      ))}
    </div>
  );
}
