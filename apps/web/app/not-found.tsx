import React from 'react';
import Link from 'next/link';
import { ErrorFooter, ErrorHeader } from './components/error-shell.js';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'var(--font-family), system-ui, sans-serif',
      }}
    >
      <ErrorHeader actionHref="/?action=register" actionText="Register Shop" />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.35rem 0.85rem',
              borderRadius: '99px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}
          >
            404 • Resource Not Found
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              margin: '0 0 1rem',
              lineHeight: 1.25,
            }}
          >
            We couldn’t find that page
          </h1>

          <p
            style={{ fontSize: '0.975rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 2rem' }}
          >
            The link you followed may be incorrect, the print session may have expired, or the shop
            address may have changed. Please verify the URL or return home to start fresh.
          </p>

          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1.75rem',
                minHeight: '44px',
                borderRadius: '99px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.925rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
              }}
            >
              Return to Home
            </Link>
            <Link
              href="/?action=register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1.75rem',
                minHeight: '44px',
                borderRadius: '99px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                fontSize: '0.925rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Register Shop
            </Link>
          </div>
        </div>
      </main>

      <ErrorFooter />
    </div>
  );
}
