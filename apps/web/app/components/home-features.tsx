import React from 'react';

const HIGHLIGHTS = [
  {
    icon: '🛡️',
    title: 'Zero WhatsApp Privacy Leaks',
    desc: 'Customer files auto-expire after printing with a strict 120-minute TTL. No sensitive Aadhaar cards or personal photos saved on anyone’s phone.',
  },
  {
    icon: '⚡',
    title: 'Instant Dynamic Price Quotes',
    desc: 'Automatic page analysis calculates exact charges for B&W vs Color, single vs duplex sides, and custom page ranges before payment.',
  },
  {
    icon: '🖨️',
    title: 'Direct Desktop Spooler',
    desc: 'The SnapPrint Desktop Agent routes approved jobs directly to your local printer driver. Zero manual downloading or file handling.',
  },
];

export function HomeFeatures() {
  return (
    <section id="features" style={{ padding: '2.5rem 1.5rem 4rem', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {HIGHLIGHTS.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3
                style={{
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.5rem',
                  letterSpacing: '-0.015em',
                }}
              >
                {item.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
