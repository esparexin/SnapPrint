'use client';

import React from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AdminAuditTable } from './admin-audit-table';
import { AdminKpiGrid } from './admin-kpi-grid';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminPortalHeader } from './admin-portal-header';
import { AdminPortalModals } from './admin-portal-modals';
import { AdminShopTable } from './admin-shop-table';
import { AdminSubscriptionsView } from './admin-subscriptions-view';
import { AdminUserTable } from './admin-user-table';
import { useAdminPortalData } from './use-admin-portal-data';

export function AdminPortalView({ auth, onLogout }: { auth: AuthResponse; onLogout: () => void }) {
  const d = useAdminPortalData();

  return (
    <div style={adminLayoutStyles.pageWrapper}>
      <AdminPortalHeader
        email={auth.user.email}
        activeTab={d.activeTab}
        onSelectTab={d.setActiveTab}
        onRefresh={() => d.loadData()}
        onLogout={onLogout}
      />
      <main style={adminLayoutStyles.main}>
        {d.error && <div style={adminLayoutStyles.errorBanner}>{d.error}</div>}
        {(d.activeTab === 'overview' || d.activeTab === 'studios') && (
          <>
            <AdminKpiGrid
              metrics={d.metrics}
              loading={d.loading}
              selectedFilter={d.statusFilter}
              onSelectFilter={d.handleKpiFilter}
            />
            <AdminShopTable
              studios={d.studios}
              loading={d.loading}
              statusFilter={d.statusFilter}
              onStatusFilterChange={d.setStatusFilter}
              onInspect={d.setInspectStudio}
              onManageStatus={d.setSelectedStudio}
              onManageSubscription={d.setOverrideSubStudio}
              onFilterChange={(st, sc) => {
                d.setStatusFilter(st || 'all');
                d.setSearchTerm(sc || '');
                d.loadData(st, sc);
              }}
            />
          </>
        )}
        {d.activeTab === 'subscriptions' && (
          <AdminSubscriptionsView
            studios={d.studios}
            loading={d.loading}
            onInspect={d.setInspectStudio}
            onManageSubscription={d.setOverrideSubStudio}
          />
        )}
        {d.activeTab === 'users' && (
          <AdminUserTable
            users={d.users}
            loading={d.loading}
            currentUserId={auth.user.id}
            togglingUserId={d.togglingUserId}
            onOpenCreateAdmin={() => d.setShowCreateAdmin(true)}
            onToggleStatus={d.handleToggleStatus}
          />
        )}
        {(d.activeTab === 'overview' || d.activeTab === 'audit') && (
          <AdminAuditTable logs={d.auditLogs} loading={d.loading} />
        )}
        <AdminPortalModals
          selectedStudio={d.selectedStudio}
          inspectStudio={d.inspectStudio}
          overrideSubStudio={d.overrideSubStudio}
          showCreateAdmin={d.showCreateAdmin}
          onCloseSelected={() => d.setSelectedStudio(null)}
          onCloseInspect={() => d.setInspectStudio(null)}
          onCloseOverrideSub={() => d.setOverrideSubStudio(null)}
          onCloseCreate={() => d.setShowCreateAdmin(false)}
          onReload={() => d.loadData()}
        />
      </main>
    </div>
  );
}
