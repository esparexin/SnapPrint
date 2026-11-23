'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AuthResponse,
  PlatformAuditEntry,
  PlatformMetricsResponse,
  PlatformStudioItem,
  StudioStatus,
} from '@snapprint/contracts';
import {
  getPlatformMetrics,
  listPlatformAuditLogs,
  listPlatformStudios,
} from '../../src/platform-admin-client';
import { AdminAuditTable } from './admin-audit-table';
import { AdminKpiGrid } from './admin-kpi-grid';
import { AdminShopTable } from './admin-shop-table';
import { AdminStatusModal } from './admin-status-modal';

export interface AdminPortalViewProps {
  auth: AuthResponse;
  onLogout: () => void;
}

export function AdminPortalView({ auth, onLogout }: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'studios' | 'audit'>('overview');
  const [metrics, setMetrics] = useState<PlatformMetricsResponse | null>(null);
  const [studios, setStudios] = useState<PlatformStudioItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<PlatformStudioItem | null>(null);

  const loadData = useCallback(async (statusFilter?: StudioStatus, searchFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, s, a] = await Promise.all([
        getPlatformMetrics(),
        listPlatformStudios({ status: statusFilter, search: searchFilter }),
        listPlatformAuditLogs(50),
      ]);
      setMetrics(m);
      setStudios(s.studios);
      setAuditLogs(a.auditLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStudioUpdated = (updated: PlatformStudioItem) => {
    setStudios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">SnapPrint</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                Platform Admin
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Signed in as <span className="font-medium text-gray-700">{auth.user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition"
            >
              Refresh
            </button>
            <a
              href="/"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition"
            >
              Shop Workspace
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 mt-2 border-t border-gray-100">
          {(['overview', 'studios', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview'
                ? 'Overview & Metrics'
                : tab === 'studios'
                  ? 'Tenants Directory'
                  : 'Audit Trail'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'studios') && (
          <AdminKpiGrid metrics={metrics} loading={loading} />
        )}

        {(activeTab === 'overview' || activeTab === 'studios') && (
          <AdminShopTable
            studios={studios}
            loading={loading}
            onManageStatus={(studio) => setSelectedStudio(studio)}
            onFilterChange={(st, sc) => loadData(st, sc)}
          />
        )}

        {(activeTab === 'overview' || activeTab === 'audit') && (
          <AdminAuditTable logs={auditLogs} loading={loading} />
        )}

        {selectedStudio && (
          <AdminStatusModal
            studio={selectedStudio}
            isOpen={Boolean(selectedStudio)}
            onClose={() => setSelectedStudio(null)}
            onUpdated={handleStudioUpdated}
          />
        )}
      </main>
    </div>
  );
}
