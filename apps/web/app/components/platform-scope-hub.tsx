'use client';

import React from 'react';

export interface PlatformScopeHubProps {
  onOpenWizard: () => void;
}

export function PlatformScopeHub({ onOpenWizard }: PlatformScopeHubProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
        padding: '1.75rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          width: '3rem',
          height: '3rem',
          backgroundColor: '#f3e8ff',
          color: '#6b21a8',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '1.125rem',
          fontWeight: 700,
        }}
      >
        PA
      </div>
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: '0 0 0.5rem',
          color: '#0f172a',
        }}
      >
        Platform Administration Hub
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#475569',
          maxWidth: '460px',
          margin: '0 auto 1.5rem',
          lineHeight: 1.5,
        }}
      >
        You are authenticated with platform-wide administrative privileges. Manage registered print
        studios, review system metrics, and inspect immutable audit logs.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <a
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Open Platform Admin Workspace &rarr;
        </a>
        <button
          type="button"
          onClick={onOpenWizard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Register New Studio
        </button>
      </div>
    </div>
  );
}
