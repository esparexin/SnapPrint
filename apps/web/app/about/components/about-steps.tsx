import React from 'react';
import { ABOUT_STEPS, StepIconKey } from '../about-data';
import { DynamicPriceIcon, QrCodeIcon, SpoolExpireIcon } from './about-icons';

function renderStepIcon(key: StepIconKey) {
  switch (key) {
    case 'qr':
      return <QrCodeIcon />;
    case 'price':
      return <DynamicPriceIcon />;
    case 'spool':
      return <SpoolExpireIcon />;
  }
}

export function AboutSteps() {
  return (
    <section style={{ marginBottom: '4rem' }}>
      <style>{`
        .steps-scroll {
          display: flex;
          gap: 1.25rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 0.75rem;
          scrollbar-width: none;
        }
        .steps-scroll::-webkit-scrollbar {
          display: none;
        }
        .step-card {
          flex: 0 0 85%;
          max-width: 320px;
          scroll-snap-align: start;
        }
        @media (min-width: 768px) {
          .steps-scroll {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            overflow-x: visible;
          }
          .step-card {
            flex: initial;
            max-width: none;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          How It Works
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
          Three simple steps from counter scan to finished print.
        </p>
      </div>

      <div className="steps-scroll">
        {ABOUT_STEPS.map((st) => (
          <div
            key={st.num}
            className="step-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {renderStepIcon(st.iconKey)}
                </div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#0284c7',
                    backgroundColor: '#e0f2fe',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '99px',
                    letterSpacing: '0.04em',
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
                  letterSpacing: '-0.015em',
                }}
              >
                {st.title}
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.55 }}>
                {st.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
