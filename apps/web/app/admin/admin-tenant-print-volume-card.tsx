'use client';

import React from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';

interface AdminTenantPrintVolumeCardProps {
  printStats?: PlatformStudioDetailsResponse['printStats'];
}

const cardStyle: React.CSSProperties = {
  padding: '0.875rem',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
};

const chip = (bg: string, color: string): React.CSSProperties => ({
  padding: '0.15rem 0.4rem',
  borderRadius: '0.25rem',
  backgroundColor: bg,
  color,
  fontWeight: 500,
});

const progressBarStyle: React.CSSProperties = {
  display: 'flex',
  height: '5px',
  borderRadius: '9999px',
  overflow: 'hidden',
  marginTop: '0.5rem',
  backgroundColor: '#e2e8f0',
};

export function AdminTenantPrintVolumeCard({ printStats }: AdminTenantPrintVolumeCardProps) {
  const total = printStats?.totalCompletedPrints ?? 0;
  const color = printStats?.colorPrints ?? 0;
  const bw = printStats?.bwPrints ?? 0;
  const colorPct = total > 0 ? Math.round((color / total) * 100) : 0;
  const bwPct = total > 0 ? 100 - colorPct : 0;

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
        Completed Print Volume
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{total}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>total completed</span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.75rem' }}>
        <span style={chip('#eff6ff', '#1e40af')}>
          Color: <strong>{color}</strong> {total > 0 && `(${colorPct}%)`}
        </span>
        <span style={chip('#f1f5f9', '#334155')}>
          B&W: <strong>{bw}</strong> {total > 0 && `(${bwPct}%)`}
        </span>
      </div>
      {total > 0 && (
        <div style={progressBarStyle}>
          <div style={{ width: `${colorPct}%`, backgroundColor: '#3b82f6' }} />
          <div style={{ width: `${bwPct}%`, backgroundColor: '#64748b' }} />
        </div>
      )}
    </div>
  );
}
