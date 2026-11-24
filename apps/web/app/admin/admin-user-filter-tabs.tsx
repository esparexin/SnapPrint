'use client';

import React from 'react';
import { PlatformUserItem } from '@snapprint/contracts';

export type ScopeFilter = 'all' | 'platform_admin' | 'tenant';

const SCOPES: { id: ScopeFilter; label: string; activeColor: string }[] = [
  { id: 'all', label: 'All Users', activeColor: '#0f172a' },
  { id: 'platform_admin', label: 'Platform Admins', activeColor: '#6b21a8' },
  { id: 'tenant', label: 'Tenant Operators', activeColor: '#0369a1' },
];

export interface AdminUserFilterTabsProps {
  users: PlatformUserItem[];
  filter: ScopeFilter;
  onSelect: (f: ScopeFilter) => void;
}

export function AdminUserFilterTabs({ users, filter, onSelect }: AdminUserFilterTabsProps) {
  const getCount = (id: ScopeFilter) => {
    if (id === 'all') return users.length;
    if (id === 'platform_admin') return users.filter((u) => u.role === 'platform_admin').length;
    return users.filter((u) => u.role !== 'platform_admin').length;
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: '0.5rem',
        backgroundColor: '#f1f5f9',
        padding: '0.2rem',
      }}
    >
      {SCOPES.map((sc) => {
        const active = filter === sc.id;
        return (
          <button
            key={sc.id}
            type="button"
            onClick={() => onSelect(sc.id)}
            style={{
              border: 'none',
              padding: '0.35rem 0.65rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: active ? '#ffffff' : 'transparent',
              color: active ? sc.activeColor : '#64748b',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {sc.label} ({getCount(sc.id)})
          </button>
        );
      })}
    </div>
  );
}
