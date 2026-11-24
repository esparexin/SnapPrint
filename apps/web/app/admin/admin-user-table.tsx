'use client';

import React from 'react';
import { PlatformUserItem } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export interface AdminUserTableProps {
  users: PlatformUserItem[];
  loading: boolean;
}

const roleStyles: Record<string, { bg: string; color: string; label: string }> = {
  platform_admin: { bg: '#f3e8ff', color: '#6b21a8', label: 'Platform Admin' },
  studio_owner: { bg: '#e0f2fe', color: '#0369a1', label: 'Studio Owner' },
  studio_staff: { bg: '#f1f5f9', color: '#334155', label: 'Studio Staff' },
};

export function AdminUserTable({ users, loading }: AdminUserTableProps) {
  return (
    <div style={adminTableStyles.card}>
      <div style={adminTableStyles.cardHeader}>
        <div>
          <h2 style={adminTableStyles.cardTitle}>System Users & RBAC Directory</h2>
          <p style={adminTableStyles.cardSubtext}>
            Governance and role visibility across all registered operators and platform
            administrators
          </p>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...adminTableStyles.td, textAlign: 'center', color: '#64748b' }}
                >
                  Loading system users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...adminTableStyles.td, textAlign: 'center', color: '#64748b' }}
                >
                  No users found matching the criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const badge = roleStyles[u.role] || roleStyles.studio_staff;
                return (
                  <tr key={u.id}>
                    <td style={adminTableStyles.tdBold}>
                      <div>{u.email}</div>
                      <div
                        style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}
                      >
                        {u.id}
                      </div>
                    </td>
                    <td style={adminTableStyles.td}>{u.name}</td>
                    <td style={adminTableStyles.td}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={adminTableStyles.td}>
                      <code style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {u.studioId ||
                          (u.role === 'platform_admin' ? 'platform_scope' : 'unassigned')}
                      </code>
                    </td>
                    <td style={adminTableStyles.td}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: u.status === 'active' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={adminTableStyles.td}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
