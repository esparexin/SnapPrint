'use client';

import React from 'react';
import { PlatformUserItem } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export interface AdminUserTableRowProps {
  user: PlatformUserItem;
  currentUserId?: string;
  isToggling?: boolean;
  onToggleStatus: (userId: string, targetStatus: 'active' | 'suspended') => void;
}

const roleStyles: Record<string, { bg: string; color: string; label: string }> = {
  platform_admin: { bg: '#f3e8ff', color: '#6b21a8', label: 'Platform Admin' },
  studio_owner: { bg: '#e0f2fe', color: '#0369a1', label: 'Studio Owner' },
  studio_staff: { bg: '#f1f5f9', color: '#334155', label: 'Studio Staff' },
};

export function AdminUserTableRow({
  user,
  currentUserId,
  isToggling,
  onToggleStatus,
}: AdminUserTableRowProps) {
  const badge = roleStyles[user.role] || roleStyles.studio_staff;
  const isSelf = currentUserId === user.id;
  const nextStatus = user.status === 'active' ? 'suspended' : 'active';

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={adminTableStyles.tdBold}>
        <div>{user.email}</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
          {user.id} {isSelf && <span style={{ color: '#0284c7' }}>(You)</span>}
        </div>
      </td>
      <td style={adminTableStyles.td}>{user.name}</td>
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
          {user.studioId || (user.role === 'platform_admin' ? 'platform_scope' : 'unassigned')}
        </code>
      </td>
      <td style={adminTableStyles.td}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: user.status === 'active' ? '#16a34a' : '#dc2626',
          }}
        >
          {user.status}
        </span>
      </td>
      <td style={adminTableStyles.tdMuted}>{new Date(user.createdAt).toLocaleDateString()}</td>
      <td style={adminTableStyles.tdRight}>
        {user.role === 'platform_admin' ? (
          <button
            type="button"
            disabled={isSelf || isToggling}
            onClick={() => onToggleStatus(user.id, nextStatus)}
            title={isSelf ? 'Cannot suspend your own account' : undefined}
            style={{
              ...adminTableStyles.input,
              cursor: isSelf || isToggling ? 'not-allowed' : 'pointer',
              opacity: isSelf || isToggling ? 0.5 : 1,
              backgroundColor: user.status === 'active' ? '#fff1f2' : '#f0fdf4',
              color: user.status === 'active' ? '#be123c' : '#15803d',
              borderColor: user.status === 'active' ? '#fecdd3' : '#bbf7d0',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {isToggling ? 'Updating...' : user.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tenant User</span>
        )}
      </td>
    </tr>
  );
}
