'use client';

import React, { useEffect, useState } from 'react';
import { StudioMetricsResponse } from '@snapprint/contracts';
import { fetchStudioMetrics } from '../../src/workspace-client';

interface WorkspaceKpiBarProps {
  studioId: string;
}

export function WorkspaceKpiBar({ studioId }: WorkspaceKpiBarProps) {
  const [metrics, setMetrics] = useState<StudioMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      try {
        const data = await fetchStudioMetrics(studioId);
        if (mounted) setMetrics(data);
      } catch {
        // Fallback silently if offline or unauthorized
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000); // 15s live refresh

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [studioId]);

  const ordersCount = metrics?.todayOrdersCount ?? 0;
  const cashTotal = ((metrics?.todayPaidCollectionsMinor ?? 0) / 100).toFixed(0);
  const pendingCount = metrics?.pendingOrdersCount ?? 0;
  const totalPages = (metrics?.printVolume?.bwPages ?? 0) + (metrics?.printVolume?.colorPages ?? 0);

  return (
    <div
      role="region"
      aria-label="Today's Operational Summary"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '16px',
        width: '100%',
      }}
    >
      {/* Box 1: Orders */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            display: 'block',
            letterSpacing: '0.04em',
          }}
        >
          Orders
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.2,
          }}
        >
          {loading ? '…' : ordersCount}
        </span>
      </div>

      {/* Box 2: Cash / Collections */}
      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '8px 10px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#15803d',
            display: 'block',
            letterSpacing: '0.04em',
          }}
        >
          Cash
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#166534',
            lineHeight: 1.2,
          }}
        >
          {loading ? '…' : `₹${cashTotal}`}
        </span>
      </div>

      {/* Box 3: Pending */}
      <div
        style={{
          backgroundColor: pendingCount > 0 ? '#fffbeb' : '#f8fafc',
          border: pendingCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: pendingCount > 0 ? '#b45309' : '#64748b',
            display: 'block',
            letterSpacing: '0.04em',
          }}
        >
          Pending
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: pendingCount > 0 ? '#b45309' : '#0f172a',
            lineHeight: 1.2,
          }}
        >
          {loading ? '…' : pendingCount}
        </span>
      </div>

      {/* Box 4: Pages */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 10px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            display: 'block',
            letterSpacing: '0.04em',
          }}
        >
          Pages
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.2,
          }}
        >
          {loading ? '…' : totalPages}
        </span>
      </div>
    </div>
  );
}
