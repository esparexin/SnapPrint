'use client';

import React, { useState } from 'react';
import { PlatformUserItem } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';
import { AdminUserFilterTabs, ScopeFilter } from './admin-user-filter-tabs';
import { AdminUserTableRow } from './admin-user-table-row';

export interface AdminUserTableProps {
  users: PlatformUserItem[];
  loading: boolean;
  currentUserId?: string;
  togglingUserId?: string | null;
  onOpenCreateAdmin: () => void;
  onToggleStatus: (userId: string, targetStatus: 'active' | 'suspended') => void;
}

export function AdminUserTable({
  users,
  loading,
  currentUserId,
  togglingUserId,
  onOpenCreateAdmin,
  onToggleStatus,
}: AdminUserTableProps) {
  const [filter, setFilter] = useState<ScopeFilter>('all');

  const filteredUsers = users.filter((u) => {
    if (filter === 'platform_admin') return u.role === 'platform_admin';
    if (filter === 'tenant') return u.role !== 'platform_admin';
    return true;
  });

  return (
    <div style={adminTableStyles.card}>
      <div style={adminTableStyles.cardHeader}>
        <div>
          <h2 style={adminTableStyles.cardTitle}>Users & RBAC Directory</h2>
          <p style={adminTableStyles.cardSubtext}>
            Distinct governance for platform administrators and tenant/studio operators
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <AdminUserFilterTabs users={users} filter={filter} onSelect={setFilter} />
          <button
            type="button"
            onClick={onOpenCreateAdmin}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Create Platform Admin
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={adminTableStyles.table}>
          <thead style={adminTableStyles.thead}>
            <tr>
              <th style={adminTableStyles.th}>User / Email</th>
              <th style={adminTableStyles.th}>Name</th>
              <th style={adminTableStyles.th}>Role</th>
              <th style={adminTableStyles.th}>Context Scope</th>
              <th style={adminTableStyles.th}>Status</th>
              <th style={adminTableStyles.th}>Registered</th>
              <th style={adminTableStyles.thRight}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={adminTableStyles.emptyCell}>
                  Loading users directory...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={adminTableStyles.emptyCell}>
                  No users found in this category.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <AdminUserTableRow
                  key={u.id}
                  user={u}
                  currentUserId={currentUserId}
                  isToggling={togglingUserId === u.id}
                  onToggleStatus={onToggleStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
