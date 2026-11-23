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
        borderBottom: '1px solid #e2e8f0',
        padding: '0.875rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
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
            gap: '0.625rem',
            textDecoration: 'none',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.125rem',
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.2 }}>SnapPrint</div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b', letterSpacing: '0.05em' }}>
              PALNADU CLOUD
            </div>
          </div>
        </a>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="snapprint-desktop-nav"
        >
          <a href="#features" style={{ fontSize: '0.9375rem', color: '#475569', fontWeight: 500 }}>
            Features
          </a>
          <a
            href="#how-it-works"
            style={{ fontSize: '0.9375rem', color: '#475569', fontWeight: 500 }}
          >
            How We Work
          </a>
          <a href="#services" style={{ fontSize: '0.9375rem', color: '#475569', fontWeight: 500 }}>
            Services
          </a>
          <a href="/admin" style={{ fontSize: '0.9375rem', color: '#475569', fontWeight: 500 }}>
            Platform Admin
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Shopkeeper Sign In
          </button>
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Register Studio
          </button>
        </div>
      </div>
    </header>
  );
}
