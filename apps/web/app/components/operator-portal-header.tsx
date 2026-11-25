'use client';

import React from 'react';
import { getAgentDownloadUrl } from '../../src/printer-client';
import { OperatorView } from './operator-portal-styles';
import { PrinterStatusBadge } from './printer-status-badge';

export type { OperatorView };

interface OperatorPortalHeaderProps {
  userName: string;
  userEmail: string;
  isPlatformAdmin: boolean;
  logoutLoading: boolean;
  onLogout: () => void;
  hideSignOut?: boolean;
  onClosePortal?: () => void;
  studioName?: string;
  studioId?: string;
}

export function OperatorPortalHeader({
  userName,
  userEmail,
  isPlatformAdmin,
  logoutLoading,
  onLogout,
  hideSignOut = false,
  onClosePortal,
  studioName,
  studioId,
}: OperatorPortalHeaderProps) {
  const headingTitle = studioName || 'SnapPrint Operator Portal';
  const showActions = isPlatformAdmin || !hideSignOut || Boolean(onClosePortal);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0,
              color: '#0f172a',
              textWrap: 'balance',
            }}
          >
            {headingTitle}
          </h1>
          {studioId && <PrinterStatusBadge studioId={studioId} />}
        </div>
        <p
          style={{
            margin: '0.2rem 0 0',
            color: '#64748b',
            fontSize: '0.8125rem',
            overflowWrap: 'anywhere',
          }}
        >
          Signed in as <strong>{userName}</strong> ({userEmail})
        </p>
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {isPlatformAdmin && (
            <a
              href="/admin"
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Admin Workspace →
            </a>
          )}
          <a
            href={getAgentDownloadUrl()}
            download="SnapPrint-Print-Agent.msi"
            target="_blank"
            rel="noopener noreferrer"
            className="portal-download-btn"
          >
            <span aria-hidden="true">📥</span>
            <span>Download</span>
          </a>
          {!hideSignOut && (
            <button
              type="button"
              onClick={onLogout}
              disabled={logoutLoading}
              className="portal-signout-btn"
            >
              {logoutLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          )}
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
      )}
    </header>
  );
}
