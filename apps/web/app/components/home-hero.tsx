'use client';

import React from 'react';

interface HomeHeroProps {
  onOpenPortal: () => void;
}

export function HomeHero({ onOpenPortal }: HomeHeroProps) {
  return (
    <section
      style={{
        padding: '3.5rem 1.5rem 2.5rem',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '1.25rem',
          }}
        >
          Zero WhatsApp Leaks • Instant Counter Xerox
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#0f172a',
            margin: '0 0 1rem',
            letterSpacing: '-0.03em',
          }}
        >
          Digital Xerox & Print Cloud
        </h1>

        <p
          style={{
            fontSize: '1.0625rem',
            color: '#475569',
            lineHeight: 1.55,
            margin: '0 auto 2rem',
            maxWidth: '620px',
          }}
        >
          Scan the counter QR code to upload documents and photos with instant pricing. Files spool
          directly to the printer and auto-expire in 120 minutes.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.875rem',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/s/demo"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
            }}
          >
            Upload & Print Demo →
          </a>
          <button
            type="button"
            onClick={onOpenPortal}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9375rem',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            Register
          </button>
        </div>
      </div>
    </section>
  );
}
