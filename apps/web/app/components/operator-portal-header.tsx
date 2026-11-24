'use client';

import React from 'react';

interface OperatorPortalHeaderProps {
  userName: string;
  userEmail: string;
  isPlatformAdmin: boolean;
  logoutLoading: boolean;
  onLogout: () => void;
}

export function OperatorPortalHeader({
  userName,
  userEmail,
  isPlatformAdmin,
  logoutLoading,
  onLogout,
}: OperatorPortalHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 200px' }}>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            margin: 0,
            color: '#111827',
            lineHeight: 1.25,
          }}
        >
          SnapPrint Operator Portal
        </h1>
        <p
          style={{
            margin: '0.25rem 0 0',
            color: '#6b7280',
            fontSize: '0.8125rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Signed in as <strong>{userName}</strong> ({userEmail})
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        {isPlatformAdmin && (
          <a
            href="/admin"
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Admin Workspace →
          </a>
        )}
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          style={{
            padding: '0.35rem 0.75rem',
            background: logoutLoading ? '#9ca3af' : '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: logoutLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {logoutLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </header>
  );
}
