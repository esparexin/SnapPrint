import React from 'react';
import { ABOUT_STEPS } from '../about-data';

export function AboutSteps() {
  return (
    <section style={{ marginBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          How It Works
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
          Three simple steps from counter scan to finished print.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {ABOUT_STEPS.map((st) => (
          <div
            key={st.num}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{st.icon}</span>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  backgroundColor: '#f0f9ff',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                STEP {st.num}
              </span>
            </div>
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                margin: '0 0 0.5rem',
                color: '#0f172a',
              }}
            >
              {st.title}
            </h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.55 }}>
              {st.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
