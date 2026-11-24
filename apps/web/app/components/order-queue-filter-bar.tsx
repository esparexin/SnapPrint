'use client';

import React from 'react';
import { OrderStatus } from '@snapprint/contracts';

interface OrderQueueFilterBarProps {
  statusFilter: OrderStatus | 'all';
  onSelectStatus: (status: OrderStatus | 'all') => void;
}

const filterOptions = ['all', 'submitted', 'processing', 'ready', 'completed'] as const;

export function OrderQueueFilterBar({ statusFilter, onSelectStatus }: OrderQueueFilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        padding: '10px 20px',
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
            padding: '5px 12px',
            borderRadius: '16px',
            fontSize: '12px',
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
