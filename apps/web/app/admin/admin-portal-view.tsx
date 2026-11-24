'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AuthResponse,
  PlatformAuditEntry,
  PlatformMetricsResponse,
  PlatformStudioItem,
  PlatformUserItem,
  StudioStatus,
} from '@snapprint/contracts';
import {
  getPlatformMetrics,
  listPlatformAuditLogs,
  listPlatformStudios,
  listPlatformUsers,
} from '../../src/platform-admin-client';
import { AdminAuditTable } from './admin-audit-table';
import { AdminKpiGrid } from './admin-kpi-grid';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminPortalHeader, AdminTabType } from './admin-portal-header';
import { AdminShopTable } from './admin-shop-table';
import { AdminStatusModal } from './admin-status-modal';
import { AdminUserTable } from './admin-user-table';

export interface AdminPortalViewProps {
  auth: AuthResponse;
  onLogout: () => void;
}

interface PortalData {
  metrics: PlatformMetricsResponse | null;
  studios: PlatformStudioItem[];
  auditLogs: PlatformAuditEntry[];
  users: PlatformUserItem[];
}

export function AdminPortalView({ auth, onLogout }: AdminPortalViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [data, setData] = useState<PortalData>({
    metrics: null,
    studios: [],
    auditLogs: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<PlatformStudioItem | null>(null);

  const loadData = useCallback(async (stFilter?: StudioStatus, scFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [metrics, s, a, u] = await Promise.all([
        getPlatformMetrics(),
        listPlatformStudios({ status: stFilter, search: scFilter }),
        listPlatformAuditLogs(50),
        listPlatformUsers(50),
      ]);
      setData({ metrics, studios: s.studios, auditLogs: a.auditLogs, users: u.users });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdated = (up: PlatformStudioItem) => {
    setData((d) => ({ ...d, studios: d.studios.map((s) => (s.id === up.id ? up : s)) }));
    loadData();
  };

  return (
    <div style={adminLayoutStyles.pageWrapper}>
      <AdminPortalHeader
        email={auth.user.email}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={() => loadData()}
        onLogout={onLogout}
      />

      <main style={adminLayoutStyles.main}>
        {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}

        {(activeTab === 'overview' || activeTab === 'studios') && (
          <>
            <AdminKpiGrid metrics={data.metrics} loading={loading} />
            <AdminShopTable
              studios={data.studios}
              loading={loading}
              onManageStatus={(st) => setSelectedStudio(st)}
              onFilterChange={(st, sc) => loadData(st, sc)}
            />
          </>
        )}

        {activeTab === 'users' && <AdminUserTable users={data.users} loading={loading} />}

        {(activeTab === 'overview' || activeTab === 'audit') && (
          <AdminAuditTable logs={data.auditLogs} loading={loading} />
        )}

        {selectedStudio && (
          <AdminStatusModal
            studio={selectedStudio}
            isOpen={Boolean(selectedStudio)}
            onClose={() => setSelectedStudio(null)}
            onUpdated={handleUpdated}
          />
        )}
      </main>
    </div>
  );
}
