'use client';

import React from 'react';
import { PlatformMetricsResponse } from '@snapprint/contracts';

export interface AdminKpiGridProps {
  metrics: PlatformMetricsResponse | null;
  loading: boolean;
}

export function AdminKpiGrid({ metrics, loading }: AdminKpiGridProps) {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
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
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Pending Onboarding',
      value: metrics?.onboardingStudios ?? 0,
      subtext: 'Awaiting setup or review',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Suspended Studios',
      value: metrics?.suspendedStudios ?? 0,
      subtext: 'Halted for compliance',
      badgeColor:
        (metrics?.suspendedStudios ?? 0) > 0
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-700',
    },
    {
      title: 'Total GMV Volume',
      value: formatCurrency(metrics?.totalPaidVolumeMinor ?? 0),
      subtext: `${metrics?.totalOrdersCount ?? 0} total platform orders`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{card.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.badgeColor}`}>
              KPI
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
          <p className="text-xs text-gray-500">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
