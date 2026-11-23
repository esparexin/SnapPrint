import React from 'react';
import { ABOUT_WHY_FEATURES, FeatureIconKey } from '../about-data';
import {
  FastQueueIcon,
  PrivacyShieldIcon,
  StoreNetworkIcon,
  TransparentPriceIcon,
} from './about-icons';

function getFeatureTheme(key: FeatureIconKey) {
  switch (key) {
    case 'shield':
      return {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        color: '#059669',
        icon: <PrivacyShieldIcon />,
      };
    case 'queue':
      return {
        bg: '#eff6ff',
        border: '#bfdbfe',
        color: '#2563eb',
        icon: <FastQueueIcon />,
      };
    case 'transparency':
      return {
        bg: '#fefce8',
        border: '#fef08a',
        color: '#ca8a04',
        icon: <TransparentPriceIcon />,
      };
    case 'store':
      return {
        bg: '#fdf4ff',
        border: '#f5d0fe',
        color: '#9333ea',
        icon: <StoreNetworkIcon />,
      };
  }
}

export function AboutWhy() {
  return (
    <section style={{ marginBottom: '4rem' }}>
      <style>{`
        .why-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 0.75rem;
          scrollbar-width: none;
        }
        .why-scroll::-webkit-scrollbar {
          display: none;
        }
        .why-card {
          flex: 0 0 78%;
          max-width: 280px;
          scroll-snap-align: start;
        }
        @media (min-width: 768px) {
          .why-scroll {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            overflow-x: visible;
          }
          .why-card {
            flex: initial;
            max-width: none;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Why SnapPrint?
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
          Built specifically to overcome traditional Xerox shop friction and privacy risks.
        </p>
      </div>

      <div className="why-scroll">
        {ABOUT_WHY_FEATURES.map((f, i) => {
          const theme = getFeatureTheme(f.iconKey);
          return (
            <div
              key={i}
              className="why-card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.border}`,
                    color: theme.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  {theme.icon}
                </div>
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    margin: '0 0 0.4rem',
                    color: '#0f172a',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
