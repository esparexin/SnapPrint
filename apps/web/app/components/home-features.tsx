import React from 'react';

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Zero WhatsApp Privacy Leaks',
    desc: 'Traditional Xerox shops leave sensitive Aadhaar cards, certificates, and photos on the shopkeeper’s WhatsApp. SnapPrint isolates files in secure tenant storage with automated 120-minute TTL purges.',
  },
  {
    icon: '⚡',
    title: 'Instant Dynamic Price Quotes',
    desc: 'Automatic page analysis calculates exact charges for B&W vs Color, Single vs Duplex sides, and selected page ranges before payment.',
  },
  {
    icon: '🖨️',
    title: 'Automated Desktop Print Spooler',
    desc: 'The SnapPrint Desktop Agent pairs with local thermal, inkjet, and laser printers, routing print jobs directly to driver spoolers without manual downloads.',
  },
  {
    icon: '💳',
    title: 'Flexible Cash & UPI Payments',
    desc: 'Accept payments your way: Instant Razorpay QR/UPI transactions directly into your bank or verified counter cash collection.',
  },
  {
    icon: '👥',
    title: 'Staff Roles & Permission Gates',
    desc: 'Empower operators and staff to review print queues and fulfill jobs while locking shop settings and payment policies to studio owners.',
  },
  {
    icon: '📱',
    title: 'No App or Login Needed for Customers',
    desc: 'Customers scan your unique counter QR code and immediately upload from their mobile browser without downloading apps or creating accounts.',
  },
];

export function HomeFeatures() {
  return (
    <section id="features" style={{ padding: '4.5rem 1.5rem', backgroundColor: '#ffffff' }}>
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
            Engineered for Modern Print Shops
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0.5rem 0 1rem',
            }}
          >
            Why Print Studios & Customers Choose SnapPrint
          </h2>
          <p
            style={{ color: '#64748b', fontSize: '1.0625rem', maxWidth: '640px', margin: '0 auto' }}
          >
            Built specifically to solve the chaotic, unorganized, and privacy-invasive workflow of
            traditional Indian Xerox centers.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '1.75rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3
                style={{
                  fontSize: '1.1875rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 0.5rem',
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
