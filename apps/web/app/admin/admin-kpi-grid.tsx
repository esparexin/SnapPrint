'use client';

import React from 'react';
import { PlatformMetricsResponse } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export interface AdminKpiGridProps {
  metrics: PlatformMetricsResponse | null;
  loading: boolean;
}

export function AdminKpiGrid({ metrics, loading }: AdminKpiGridProps) {
  if (loading && !metrics) {
    return (
      <div style={adminTableStyles.kpiGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: '6rem',
              backgroundColor: '#e2e8f0',
              borderRadius: '0.75rem',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  }

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(minor / 100);
  };

  const cards = [
    {
      title: 'Total Studios',
      value: metrics?.totalStudios ?? 0,
      subtext: `${metrics?.activeStudios ?? 0} currently active`,
      bg: '#eff6ff',
      color: '#1d4ed8',
    },
    {
      title: 'Pending Onboarding',
      value: metrics?.onboardingStudios ?? 0,
      subtext: 'Awaiting setup or review',
      bg: '#fffbeb',
      color: '#b45309',
    },
    {
      title: 'Suspended Studios',
      value: metrics?.suspendedStudios ?? 0,
      subtext: 'Halted for compliance',
      bg: (metrics?.suspendedStudios ?? 0) > 0 ? '#fef2f2' : '#f1f5f9',
      color: (metrics?.suspendedStudios ?? 0) > 0 ? '#b91c1c' : '#475569',
    },
    {
      title: 'Total GMV Volume',
      value: formatCurrency(metrics?.totalPaidVolumeMinor ?? 0),
      subtext: `${metrics?.totalOrdersCount ?? 0} total platform orders`,
      bg: '#ecfdf5',
      color: '#047857',
    },
  ];

  return (
    <div style={adminTableStyles.kpiGrid}>
      {cards.map((card) => (
        <div key={card.title} style={adminTableStyles.kpiCard}>
          <div style={adminTableStyles.kpiHeader}>
            <span style={adminTableStyles.kpiTitle}>{card.title}</span>
            <span
              style={{
                ...adminTableStyles.kpiBadge,
                backgroundColor: card.bg,
                color: card.color,
              }}
            >
              KPI
            </span>
          </div>
          <div style={adminTableStyles.kpiValue}>{card.value}</div>
          <p style={adminTableStyles.kpiSubtext}>{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
