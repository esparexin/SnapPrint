import React from 'react';
import type { Metadata } from 'next';
import { ErrorFooter, ErrorHeader } from '../components/error-shell.js';

export const metadata: Metadata = {
  title: 'Terms & Conditions — SnapPrint',
  description:
    'SnapPrint network terms of service: multi-tenant print infrastructure, dynamic page-rate binding quotations, and operator fulfillment standards.',
};

export default function TermsPage() {
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
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Network Service Agreement
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
            Terms & Conditions
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
              1. Multi-Tenant Print Network
            </h2>
            <p>
              SnapPrint provides a software-as-a-service cloud printing and digital counter Xerox
              infrastructure connecting customers to independent, authorized print studios and copy
              centers.
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
              2. Transparent & Binding Pricing
            </h2>
            <p>
              Page count, color vs. black-and-white, duplex mode, and paper sizes are dynamically
              calculated via authoritative server schemas before payment. All quotations generated
              by the platform are strictly binding on the fulfilling studio.
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
              3. Operator Fulfillment Commitments
            </h2>
            <p>
              Enrolled print studios agree to inspect and process spool jobs promptly, maintain
              standard paper stocks, ensure clean print output without ink streaks or misalignment,
              and honor customer Pay at Counter or Online payment selections.
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
              4. Prohibited Content
            </h2>
            <p>
              Users agree not to upload counterfeit currency reproductions, unauthorized copyrighted
              materials, or illegal content. SnapPrint reserves the right to terminate access for
              violators.
            </p>
          </section>
        </div>
      </main>

      <ErrorFooter />
    </div>
  );
}
