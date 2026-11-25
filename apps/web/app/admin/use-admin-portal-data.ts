'use client';

import { useCallback, useEffect, useState } from 'react';
import {
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
import { AdminTabType } from './admin-portal-header';

export function useAdminPortalData() {
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

  return {
    activeTab,
    setActiveTab,
    metrics,
    studios,
    auditLogs,
    users,
    loading,
    error,
    selectedStudio,
    setSelectedStudio,
    inspectStudio,
    setInspectStudio,
    overrideSubStudio,
    setOverrideSubStudio,
    showCreateAdmin,
    setShowCreateAdmin,
    togglingUserId,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    loadData,
    handleToggleStatus,
    handleKpiFilter,
  };
}
