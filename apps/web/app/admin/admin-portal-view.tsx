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
  updatePlatformUserStatus,
} from '../../src/platform-admin-client';
import { AdminAuditTable } from './admin-audit-table';
import { AdminKpiGrid } from './admin-kpi-grid';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminPortalHeader, AdminTabType } from './admin-portal-header';
import { AdminPortalModals } from './admin-portal-modals';
import { AdminShopTable } from './admin-shop-table';
import { AdminUserTable } from './admin-user-table';

export function AdminPortalView({ auth, onLogout }: { auth: AuthResponse; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [metrics, setMetrics] = useState<PlatformMetricsResponse | null>(null);
  const [studios, setStudios] = useState<PlatformStudioItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditEntry[]>([]);
  const [users, setUsers] = useState<PlatformUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<PlatformStudioItem | null>(null);
  const [inspectStudio, setInspectStudio] = useState<PlatformStudioItem | null>(null);
  const [overrideSubStudio, setOverrideSubStudio] = useState<PlatformStudioItem | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async (stFilter?: StudioStatus, scFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, s, a, u] = await Promise.all([
        getPlatformMetrics(),
        listPlatformStudios({ status: stFilter, search: scFilter }),
        listPlatformAuditLogs(50),
        listPlatformUsers(50),
      ]);
      setMetrics(m);
      setStudios(s.studios);
      setAuditLogs(a.auditLogs);
      setUsers(u.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch platform administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (userId: string, targetStatus: 'active' | 'suspended') => {
    setTogglingUserId(userId);
    setError(null);
    try {
      await updatePlatformUserStatus(userId, targetStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleKpiFilter = (flt: StudioStatus | 'all') => {
    setStatusFilter(flt);
    loadData(flt === 'all' ? undefined : flt, searchTerm || undefined);
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
            <AdminKpiGrid
              metrics={metrics}
              loading={loading}
              selectedFilter={statusFilter}
              onSelectFilter={handleKpiFilter}
            />
            <AdminShopTable
              studios={studios}
              loading={loading}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onInspect={setInspectStudio}
              onManageStatus={setSelectedStudio}
              onManageSubscription={setOverrideSubStudio}
              onFilterChange={(st, sc) => {
                setStatusFilter(st || 'all');
                setSearchTerm(sc || '');
                loadData(st, sc);
              }}
            />
          </>
        )}
        {activeTab === 'users' && (
          <AdminUserTable
            users={users}
            loading={loading}
            currentUserId={auth.user.id}
            togglingUserId={togglingUserId}
            onOpenCreateAdmin={() => setShowCreateAdmin(true)}
            onToggleStatus={handleToggleStatus}
          />
        )}
        {(activeTab === 'overview' || activeTab === 'audit') && (
          <AdminAuditTable logs={auditLogs} loading={loading} />
        )}
        <AdminPortalModals
          selectedStudio={selectedStudio}
          inspectStudio={inspectStudio}
          overrideSubStudio={overrideSubStudio}
          showCreateAdmin={showCreateAdmin}
          onCloseSelected={() => setSelectedStudio(null)}
          onCloseInspect={() => setInspectStudio(null)}
          onCloseOverrideSub={() => setOverrideSubStudio(null)}
          onCloseCreate={() => setShowCreateAdmin(false)}
          onReload={() => loadData()}
        />
      </main>
    </div>
  );
}
