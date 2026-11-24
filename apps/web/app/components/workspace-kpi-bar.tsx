'use client';

import React, { useEffect, useState } from 'react';
import { StudioMetricsResponse } from '@snapprint/contracts';
import { fetchStudioMetrics } from '../../src/workspace-client';
import type { OperatorView } from './operator-portal-header';

interface WorkspaceKpiBarProps {
  studioId: string;
  onNavigate?: (view: OperatorView) => void;
}

export function WorkspaceKpiBar({ studioId, onNavigate }: WorkspaceKpiBarProps) {
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

  const kpis = [
    {
      label: 'Orders',
      val: loading ? '…' : ordersCount,
      view: 'orders' as OperatorView,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#0f172a',
      subColor: '#64748b',
    },
    {
      label: 'Cash',
      val: loading ? '…' : `₹${cashTotal}`,
      view: 'payment' as OperatorView,
      bg: '#f0fdf4',
      border: '#bbf7d0',
      color: '#166534',
      subColor: '#15803d',
    },
    {
      label: 'Pending',
      val: loading ? '…' : pendingCount,
      view: 'orders' as OperatorView,
      bg: pendingCount > 0 ? '#fffbeb' : '#f8fafc',
      border: pendingCount > 0 ? '#fde68a' : '#e2e8f0',
      color: pendingCount > 0 ? '#b45309' : '#0f172a',
      subColor: pendingCount > 0 ? '#b45309' : '#64748b',
    },
    {
      label: 'Pages',
      val: loading ? '…' : totalPages,
      view: 'orders' as OperatorView,
      bg: '#f8fafc',
      border: '#e2e8f0',
      color: '#0f172a',
      subColor: '#64748b',
    },
  ];

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
      {kpis.map((kpi) => (
        <button
          key={kpi.label}
          type="button"
          onClick={() => onNavigate?.(kpi.view)}
          style={{
            backgroundColor: kpi.bg,
            border: `1px solid ${kpi.border}`,
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
            cursor: onNavigate ? 'pointer' : 'default',
            width: '100%',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: kpi.subColor,
              display: 'block',
              letterSpacing: '0.04em',
            }}
          >
            {kpi.label}
          </span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: kpi.color,
              lineHeight: 1.2,
            }}
          >
            {kpi.val}
          </span>
        </button>
      ))}
    </div>
  );
}
