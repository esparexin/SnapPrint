'use client';

import React from 'react';
import { PlatformMetricsResponse, StudioStatus } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export interface AdminKpiGridProps {
  metrics: PlatformMetricsResponse | null;
  loading: boolean;
  selectedFilter?: string;
  onSelectFilter?: (filter: StudioStatus | 'all') => void;
}

export function AdminKpiGrid({
  metrics,
  loading,
  selectedFilter,
  onSelectFilter,
}: AdminKpiGridProps) {
  if (loading && !metrics) {
    return (
      <div style={adminTableStyles.kpiGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: '4.5rem',
              backgroundColor: '#e2e8f0',
              borderRadius: '0.5rem',
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

  const cards: Array<{
    title: string;
    value: string | number;
    subtext: string;
    bg: string;
    color: string;
    filter?: StudioStatus | 'all';
  }> = [
    {
      title: 'Total Studios',
      value: metrics?.totalStudios ?? 0,
      subtext: `${metrics?.activeStudios ?? 0} currently active`,
      bg: '#eff6ff',
      color: '#1d4ed8',
      filter: 'all',
    },
    {
      title: 'Pending Onboarding',
      value: metrics?.onboardingStudios ?? 0,
      subtext: 'Awaiting setup or review',
      bg: '#fffbeb',
      color: '#b45309',
      filter: 'onboarding',
    },
    {
      title: 'Suspended Studios',
      value: metrics?.suspendedStudios ?? 0,
      subtext: 'Halted for compliance',
      bg: (metrics?.suspendedStudios ?? 0) > 0 ? '#fef2f2' : '#f1f5f9',
      color: (metrics?.suspendedStudios ?? 0) > 0 ? '#b91c1c' : '#475569',
      filter: 'suspended',
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
      {cards.map((card) => {
        const isClickable = Boolean(card.filter && onSelectFilter);
        const isSelected = Boolean(card.filter && selectedFilter === card.filter);
        return (
          <div
            key={card.title}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={() => {
              if (isClickable && card.filter) {
                onSelectFilter?.(card.filter);
              }
            }}
            onKeyDown={(e) => {
              if (isClickable && card.filter && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectFilter?.(card.filter);
              }
            }}
            style={{
              ...adminTableStyles.kpiCard,
              cursor: isClickable ? 'pointer' : 'default',
              borderColor: isSelected ? card.color : '#e2e8f0',
              boxShadow: isSelected
                ? `0 0 0 2px ${card.color}25, 0 2px 4px rgba(0, 0, 0, 0.08)`
                : '0 1px 2px rgba(0, 0, 0, 0.04)',
              transform: isSelected ? 'translateY(-1px)' : 'none',
            }}
          >
            <div style={adminTableStyles.kpiHeader}>
              <span style={adminTableStyles.kpiTitle}>{card.title}</span>
              <span
                style={{
                  ...adminTableStyles.kpiBadge,
                  backgroundColor: card.bg,
                  color: card.color,
                }}
              >
                {isSelected ? 'FILTER ACTIVE' : 'KPI'}
              </span>
            </div>
            <div style={adminTableStyles.kpiValue}>{card.value}</div>
            <p style={adminTableStyles.kpiSubtext}>{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
