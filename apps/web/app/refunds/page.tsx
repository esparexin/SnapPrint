import React from 'react';
import type { Metadata } from 'next';
import { ErrorFooter, ErrorHeader } from '../components/error-shell.js';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — SnapPrint',
  description:
    'SnapPrint refund, cancellation, and print defect resolution policy for Pay at Counter and online payments.',
};

export default function RefundsPage() {
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
              backgroundColor: '#fef3c7',
              color: '#92400e',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Customer Assurance & Dispute Resolution
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
            Refund & Cancellation Policy
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
              1. Order Cancellation
            </h2>
            <p>
              Customers may cancel print jobs prior to operator release or hardware spooling. If the
              shop operator has not yet dispatched the print job to native hardware, online payments
              will be refunded in full.
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
              2. Print Quality Defects & Hardware Malfunctions
            </h2>
            <p>
              In the event of paper jams, toner streaks, distorted margins, or illegible outputs,
              the fulfilling studio is obligated to immediately provide a clean reprint at zero
              additional charge. If a reprint cannot be completed, the shop will issue a full
              refund.
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
              3. Refund Processing Timelines
            </h2>
            <p>
              For Pay-at-Counter cash or offline UPI payments, refunds are settled directly at the
              counter by the shop operator. For online gateway payments (Razorpay), approved refunds
              are initiated within 24 hours and credited to the customer’s original payment source
              (bank account, UPI, or card) within 5 to 7 business days.
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
              4. Support & Escalations
            </h2>
            <p>
              For unresolvable disputes or technical payment deductions where jobs failed to
              register, reach our support team at{' '}
              <a href="mailto:contact@snapprint.in" style={{ color: '#0284c7', fontWeight: 600 }}>
                contact@snapprint.in
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <ErrorFooter />
    </div>
  );
}
