'use client';

import React, { useEffect } from 'react';

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log sanitized fatal error to diagnostic console
    console.error('Fatal root layout error caught by global error boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>SnapPrint — Application Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '0.85rem 1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.png"
                alt="SnapPrint"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                }}
              >
                SnapPrint
              </span>
            </div>
            <a
              href="/"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              Home
            </a>
          </div>
        </header>

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
              Application Error
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
              Fatal Application Error
            </h1>

            <p
              style={{
                fontSize: '0.975rem',
                color: '#64748b',
                lineHeight: 1.6,
                margin: '0 0 1.5rem',
              }}
            >
              A critical error occurred in the application shell. Please attempt to recover by
              re-initializing the session or reloading the application.
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
                Diagnostic ID: {error.digest}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center',
              }}
            >
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
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
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
                  cursor: 'pointer',
                }}
              >
                Reload SnapPrint
              </button>
            </div>
          </div>
        </main>

        <footer
          style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem',
              color: '#64748b',
            }}
          >
            <span>© 2026 SnapPrint Technologies</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
                Home
              </a>
              <a
                href="https://www.palnadu.dev"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0284c7',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Developed by Palnadu.dev
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
