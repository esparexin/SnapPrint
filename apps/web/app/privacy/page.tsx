import React from 'react';
import type { Metadata } from 'next';
import { ErrorFooter, ErrorHeader } from '../components/error-shell.js';

export const metadata: Metadata = {
  title: 'Privacy Policy — SnapPrint',
  description:
    'SnapPrint zero-retention privacy policy: 120-minute ephemeral document auto-expiry, encrypted direct printer spooling, and zero WhatsApp data leaks.',
};

export default function PrivacyPolicyPage() {
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
          maxWidth: '800px',
          width: '100%',
          margin: '0 auto',
          padding: '3rem 1.5rem 4rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            padding: '2.5rem 2rem',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.35rem 0.85rem',
              borderRadius: '99px',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Data Trust & Privacy Guarantee
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              margin: '0 0 1.5rem',
              lineHeight: 1.25,
            }}
          >
            Privacy Policy
          </h1>

          <section style={{ marginBottom: '1.75rem', lineHeight: 1.7, color: '#334155' }}>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              1. Zero WhatsApp Privacy Leaks
            </h2>
            <p>
              Customer files uploaded to SnapPrint auto-expire with a strict 120-minute TTL. No
              sensitive documents (Aadhaar cards, voter IDs, educational certificates, personal
              photos) remain saved on studio computers or operator personal phones.
            </p>
          </section>

          <section style={{ marginBottom: '1.75rem', lineHeight: 1.7, color: '#334155' }}>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              2. Encrypted Spooling & Native Purging
            </h2>
            <p>
              Documents travel via TLS encrypted channels directly to the local printer spool queue
              on enrolled desktop devices. Immediately after spooling to native hardware, temporary
              cached files are permanently purged from local storage.
            </p>
          </section>

          <section style={{ marginBottom: '1.75rem', lineHeight: 1.7, color: '#334155' }}>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              3. Data Trust & Non-Disclosure
            </h2>
            <p>
              SnapPrint operates on a zero-commercialization data model. We never sell, rent,
              monetize, or disclose customer phone numbers, payment details, or document contents to
              third-party advertisers or data brokers.
            </p>
          </section>

          <section style={{ lineHeight: 1.7, color: '#334155' }}>
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              4. Cookies & Ephemeral Sessions
            </h2>
            <p>
              Customer mobile ordering sessions are authenticated purely via time-limited
              cryptographic tokens. No tracking or cross-site advertising cookies are placed on
              customer devices. Operator sessions utilize strictly necessary HTTP-only cookies for
              authentication.
            </p>
          </section>
        </div>
      </main>

      <ErrorFooter />
    </div>
  );
}
