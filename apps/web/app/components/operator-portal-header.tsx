'use client';

import React from 'react';

export type OperatorView =
  | 'hub'
  | 'orders'
  | 'printers'
  | 'qr'
  | 'profile'
  | 'payment'
  | 'staff'
  | 'setup';

interface OperatorPortalHeaderProps {
  userName: string;
  userEmail: string;
  isPlatformAdmin: boolean;
  logoutLoading: boolean;
  onLogout: () => void;
  activeView?: OperatorView;
  onNavigate?: (view: OperatorView) => void;
  onClosePortal?: () => void;
  studioName?: string;
}

const VIEW_TITLES: Record<OperatorView, string> = {
  hub: 'SnapPrint Operator Portal',
  orders: 'Order Fulfillment Queue',
  printers: 'Printer Fleet & Pairing',
  qr: 'Permanent Counter QR Code',
  profile: 'Shop Profile & Capabilities',
  payment: 'Payment & Rate Settings',
  staff: 'Staff & Team Roster',
  setup: 'Shop Setup Wizard',
};

export function OperatorPortalHeader({
  userName,
  userEmail,
  isPlatformAdmin,
  logoutLoading,
  onLogout,
  activeView = 'hub',
  onNavigate,
  onClosePortal,
  studioName,
}: OperatorPortalHeaderProps) {
  const isSubView = activeView !== 'hub';
  const headingTitle = isSubView
    ? VIEW_TITLES[activeView] || 'Operator Portal'
    : studioName || 'SnapPrint Operator Portal';

  return (
    <header
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem',
        paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isSubView && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('hub')}
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            ← Dashboard
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            {headingTitle}
          </h1>
          <p
            style={{
              margin: '0.15rem 0 0',
              color: '#6b7280',
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Signed in as <strong>{userName}</strong> ({userEmail})
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
        {isPlatformAdmin && (
          <a
            href="/admin"
            style={{
              padding: '0.35rem 0.65rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
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
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          {logoutLoading ? 'Signing out...' : 'Sign Out'}
        </button>
        {onClosePortal && (
          <button
            type="button"
            onClick={onClosePortal}
            aria-label="Close Portal"
            className="dialog-close-btn"
            style={{ minWidth: '32px', minHeight: '32px', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
}
