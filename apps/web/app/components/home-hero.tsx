'use client';

import React from 'react';

interface HomeHeroProps {
  onOpenPortal: () => void;
}

export function HomeHero({ onOpenPortal }: HomeHeroProps) {
  return (
    <section
      style={{
        padding: '4.5rem 1.5rem 3.5rem',
        background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.875rem',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          <span>⚡ Next-Generation Digital Xerox & Photo SaaS</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#0f172a',
            margin: '0 0 1.25rem',
            letterSpacing: '-0.025em',
          }}
        >
          Print Documents & Photos{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Without Privacy Leaks
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#475569',
            lineHeight: 1.6,
            margin: '0 auto 2.25rem',
            maxWidth: '720px',
          }}
        >
          Stop sharing sensitive Aadhaar cards, certificates, and personal photos over WhatsApp.
          Customers scan a counter QR code to upload files with instant pricing, while shopkeepers
          print directly through our automated desktop spooler driver.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '3rem',
          }}
        >
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              padding: '0.875rem 1.75rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)',
            }}
          >
            Open Shopkeeper Portal
          </button>
          <a
            href="/s/demo"
            style={{
              padding: '0.875rem 1.75rem',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '1rem',
              border: '1px solid #cbd5e1',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            Customer Studio Demo →
          </a>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            textAlign: 'left',
          }}
        >
          {[
            { title: 'Zero App Installs', desc: 'Instant browser QR upload' },
            { title: '120-Min Auto-Purge', desc: 'Strict zero-leak session TTL' },
            { title: 'UPI & Cash Counter', desc: 'Flexible payment policies' },
            { title: 'Desktop Spooler', desc: 'Direct printer driver routing' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                ✓ {item.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
