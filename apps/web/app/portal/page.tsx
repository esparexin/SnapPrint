'use client';

import React from 'react';
import Link from 'next/link';
import { OperatorPortal } from '../components/operator-portal';

export default function PortalPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <header
        style={{
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              src="/favicon.png"
              alt="SnapPrint"
              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
            />
            <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>SnapPrint</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#0284c7',
                background: '#e0f2fe',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                border: '1px solid #bae6fd',
              }}
            >
              Shop Portal
            </span>
          </Link>
          <Link
            href="/"
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#64748b',
              textDecoration: 'none',
            }}
          >
            ← Home
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <OperatorPortal />
      </main>
    </div>
  );
}
