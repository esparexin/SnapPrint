'use client';

import React from 'react';
import { adminLayoutStyles } from './admin-layout-styles';

export type AdminTabType = 'overview' | 'studios' | 'users' | 'audit';

interface AdminPortalHeaderProps {
  email: string;
  activeTab: AdminTabType;
  onSelectTab: (tab: AdminTabType) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

const TABS: { id: AdminTabType; label: string }[] = [
  { id: 'overview', label: 'Overview & Metrics' },
  { id: 'studios', label: 'Tenants Directory' },
  { id: 'users', label: 'Users & RBAC' },
  { id: 'audit', label: 'Audit Trail' },
];

export function AdminPortalHeader({
  email,
  activeTab,
  onSelectTab,
  onRefresh,
  onLogout,
}: AdminPortalHeaderProps) {
  return (
    <header style={adminLayoutStyles.header}>
      <div style={adminLayoutStyles.headerInner}>
        <div>
          <div style={adminLayoutStyles.brandRow}>
            <h1 style={adminLayoutStyles.brandTitle}>SnapPrint</h1>
            <span style={adminLayoutStyles.badgeAdmin}>Platform Admin</span>
          </div>
          <p style={adminLayoutStyles.userSubtext}>
            Signed in as <strong style={{ color: '#334155' }}>{email}</strong>
          </p>
        </div>
        <div style={adminLayoutStyles.btnRow}>
          <button type="button" onClick={onRefresh} style={adminLayoutStyles.btnSecondary}>
            Refresh
          </button>
          <a href="/?action=portal" style={adminLayoutStyles.btnSecondary}>
            Shop Workspace
          </a>
          <button type="button" onClick={onLogout} style={adminLayoutStyles.btnDanger}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={adminLayoutStyles.tabRow}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTab(t.id)}
            style={
              activeTab === t.id ? adminLayoutStyles.tabBtnActive : adminLayoutStyles.tabBtnInactive
            }
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
