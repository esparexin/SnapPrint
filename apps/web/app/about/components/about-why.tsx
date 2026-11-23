import React from 'react';
import { ABOUT_WHY_FEATURES } from '../about-data';

export function AboutWhy() {
  return (
    <section style={{ marginBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Why SnapPrint?
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
          Built specifically to overcome traditional Xerox shop friction and privacy risks.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {ABOUT_WHY_FEATURES.map((f, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>{f.icon}</div>
            <h3
              style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}
            >
              {f.title}
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
