import React from 'react';

const STEPS = [
  {
    step: '01',
    title: 'Scan Counter QR & Upload',
    desc: 'Customer scans your studio QR code using any smartphone camera. No app download or account creation required. Drag and drop PDFs, docs, or photos up to 50MB.',
  },
  {
    step: '02',
    title: 'Live Quotation & Payment',
    desc: 'Customer picks page range, color mode (B&W or Color), and single or duplex sides. Live quote appears instantly. Pay via UPI QR or choose Cash at Counter.',
  },
  {
    step: '03',
    title: 'Instant Desktop Spool & Pickup',
    desc: 'SnapPrint Desktop Agent routes the file directly to your physical printer driver. Hand over fresh prints to the customer with zero manual file downloads.',
  },
];

export function HomeWorkflow() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: '4.5rem 1.5rem',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
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
            How We Work
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0.5rem 0 1rem',
            }}
          >
            Simple 3-Step Counter Print Workflow
          </h2>
          <p
            style={{ color: '#64748b', fontSize: '1.0625rem', maxWidth: '640px', margin: '0 auto' }}
          >
            Fast, touch-free, and designed to eliminate shop queues and WhatsApp confusion.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '2rem 1.75rem',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: '#e0f2fe',
                  lineHeight: 1,
                  marginBottom: '1rem',
                }}
              >
                {s.step}
              </div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.75rem',
                }}
              >
                {s.title}
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
