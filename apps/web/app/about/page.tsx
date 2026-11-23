import React from 'react';
import Link from 'next/link';
import { AboutSteps } from './components/about-steps';
import { AboutWhy } from './components/about-why';

export const metadata = {
  title: 'About SnapPrint — Digital Xerox & Cloud Print Network',
  description:
    'Learn how SnapPrint works: zero-login counter QR document uploading, automated page-rate calculation, and zero WhatsApp privacy leaks.',
};

export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'var(--font-family)',
      }}
    >
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
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
          >
            <img
              src="/brand/snapprint-icon.png"
              alt="SnapPrint"
              style={{
                width: '32px',
                height: '32px',
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
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href="/"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              ← Back to Home
            </Link>
            <Link
              href="/?action=register"
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '99px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              }}
            >
              Register Shop
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        <section style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.9rem',
              borderRadius: '99px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontSize: '0.825rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              letterSpacing: '0.02em',
            }}
          >
            PALNADU PRINT NETWORK
          </div>
          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              margin: '0 0 1rem',
              lineHeight: 1.15,
            }}
          >
            Digital Xerox & Cloud Print Network
          </h1>
          <p
            style={{
              maxWidth: '680px',
              margin: '0 auto',
              fontSize: '1.1rem',
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            SnapPrint connects everyday users with verified local Xerox shops and print centers —
            enabling quick, frictionless document printing with guaranteed privacy.
          </p>
        </section>

        <AboutSteps />

        <AboutWhy />

        <section
          style={{
            backgroundColor: '#0284c7',
            borderRadius: '20px',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(2, 132, 199, 0.3)',
          }}
        >
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
            Own a Xerox Center or Print Shop?
          </h2>
          <p
            style={{
              maxWidth: '560px',
              margin: '0 auto 1.75rem',
              fontSize: '1rem',
              color: '#e0f2fe',
              lineHeight: 1.55,
            }}
          >
            Connect your store to the SnapPrint network. Start receiving digital queue orders
            directly to your printers today.
          </p>
          <Link
            href="/?action=register"
            style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              borderRadius: '99px',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              fontSize: '0.95rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            Register Your Shop Now →
          </Link>
        </section>
      </main>

      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          padding: '1.75rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: '#64748b',
          }}
        >
          <span>© 2026 Palnadu.dev • Multi-Tenant Print Network</span>
          <Link href="/" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
            SnapPrint Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
