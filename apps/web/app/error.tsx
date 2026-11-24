'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ErrorFooter, ErrorHeader } from './components/error-shell.js';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error('Unhandled route error caught by error boundary:', error);
  }, [error]);

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
      <ErrorHeader />

      <main
        role="alert"
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
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}
          >
            500 • Unexpected Error
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
            Something went wrong
          </h1>

          <p style={{ fontSize: '0.975rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            An unexpected error occurred while processing your request. Your documents and data
            remain safe. You can retry the operation or return to the home page.
          </p>

          {error.digest && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.8rem',
                color: '#64748b',
                fontFamily: 'monospace',
                marginBottom: '1.75rem',
                wordBreak: 'break-all',
              }}
            >
              Error Reference ID: {error.digest}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
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
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
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
              Return to Home
            </Link>
          </div>
        </div>
      </main>

      <ErrorFooter />
    </div>
  );
}
