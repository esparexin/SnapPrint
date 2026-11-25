'use client';

import React from 'react';

export interface TierCounts {
  total: number;
  active: number;
  free: number;
  paid: number;
  expired: number;
  none: number;
}

export function AdminSubscriptionTierCards({ counts }: { counts: TierCounts }) {
  const cards = [
    { label: 'Total Tenants', value: counts.total, color: '#0f172a', bg: '#f8fafc' },
    { label: 'Active Plans', value: counts.active, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Free Trial', value: counts.free, color: '#0284c7', bg: '#f0f9ff' },
    { label: 'Paid Plans', value: counts.paid, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Not Enrolled', value: counts.none, color: '#d97706', bg: '#fffbeb' },
    { label: 'Expired', value: counts.expired, color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            backgroundColor: c.bg,
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{c.label}</div>
          <div
            style={{ fontSize: '1.5rem', fontWeight: 800, color: c.color, marginTop: '0.25rem' }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
