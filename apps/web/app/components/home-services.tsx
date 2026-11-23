import React from 'react';

const SERVICES = [
  {
    badge: 'Xerox & Docs',
    title: 'B&W & Color Document Printing',
    desc: 'High-speed single and duplex document printing for academic projects, legal paperwork, official forms, and business filings.',
    details: ['Single-sided & Duplex', 'A4, A3, Legal paper sizes', 'Custom page range filter'],
  },
  {
    badge: 'Photo Lab',
    title: 'Studio Quality Photo Prints',
    desc: 'Professional grade photo lab prints with automatic aspect ratio checking and image dpi validation before printing.',
    details: ['Passport & Stamp size', '4x6, 5x7, 8x10 lab sizes', 'Glossy & Matte paper options'],
  },
  {
    badge: 'Shop SaaS',
    title: 'Complete Studio Management',
    desc: 'Comprehensive management workspace for studio owners: live order queue, printer status monitoring, staff roles, and analytics.',
    details: [
      'Desktop Agent Driver',
      'Staff permission controls',
      'Cash & UPI settlement tracking',
    ],
  },
];

export function HomeServices() {
  return (
    <section id="services" style={{ padding: '4.5rem 1.5rem', backgroundColor: '#ffffff' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span
            style={{
              color: '#0284c7',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Capabilities & Services
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0.5rem 0 1rem',
            }}
          >
            Printing Solutions for Every Requirement
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
          }}
        >
          {SERVICES.map((srv, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.625rem',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                  }}
                >
                  {srv.badge}
                </span>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 0.75rem',
                  }}
                >
                  {srv.title}
                </h3>
                <p
                  style={{
                    color: '#475569',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    margin: '0 0 1.5rem',
                  }}
                >
                  {srv.desc}
                </p>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '1rem',
                }}
              >
                {srv.details.map((d, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: '0.875rem',
                      color: '#64748b',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ color: '#0284c7', fontWeight: 'bold' }}>✓</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
