'use client';

import React from 'react';

interface HomeNavbarProps {
  onOpenPortal: () => void;
}

export function HomeNavbar({ onOpenPortal }: HomeNavbarProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        padding: '0.75rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
            SnapPrint
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#features" style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
            Features
          </a>
          <a href="/admin" style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
            Admin
          </a>
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.875rem',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.375rem 0.5rem',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            Register
          </button>
        </nav>
      </div>
    </header>
  );
}
