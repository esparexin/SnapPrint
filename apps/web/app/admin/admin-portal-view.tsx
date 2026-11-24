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
import { adminLayoutStyles } from './admin-layout-styles';
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
    <div style={adminLayoutStyles.pageWrapper}>
      <header style={adminLayoutStyles.header}>
        <div style={adminLayoutStyles.headerInner}>
          <div>
            <div style={adminLayoutStyles.brandRow}>
              <h1 style={adminLayoutStyles.brandTitle}>SnapPrint</h1>
              <span style={adminLayoutStyles.badgeAdmin}>Platform Admin</span>
            </div>
            <p style={adminLayoutStyles.userSubtext}>
              Signed in as <strong style={{ color: '#334155' }}>{auth.user.email}</strong>
            </p>
          </div>

          <div style={adminLayoutStyles.btnRow}>
            <button type="button" onClick={() => loadData()} style={adminLayoutStyles.btnSecondary}>
              Refresh
            </button>
            <a href="/" style={adminLayoutStyles.btnSecondary}>
              Shop Workspace
            </a>
            <button type="button" onClick={onLogout} style={adminLayoutStyles.btnDanger}>
              Sign Out
            </button>
          </div>
        </div>

        <div style={adminLayoutStyles.tabRow}>
          {(['overview', 'studios', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={
                activeTab === tab
                  ? adminLayoutStyles.tabBtnActive
                  : adminLayoutStyles.tabBtnInactive
              }
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

      <main style={adminLayoutStyles.main}>
        {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}

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
