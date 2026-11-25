import React, { CSSProperties } from 'react';

const cardStyles: CSSProperties = {
  maxWidth: '26rem',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
  border: '1px solid #e2e8f0',
  padding: '2.5rem 2rem',
  textAlign: 'center',
  boxSizing: 'border-box',
};

const emojiStyles: CSSProperties = {
  fontSize: '2.5rem',
  lineHeight: 1,
  marginBottom: '1rem',
  userSelect: 'none',
};

const titleStyles: CSSProperties = {
  fontSize: '1.375rem',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 0.5rem',
  letterSpacing: '-0.025em',
};

const subtitleStyles: CSSProperties = {
  fontSize: '0.9375rem',
  color: '#475569',
  margin: '0 0 1.5rem',
  lineHeight: 1.5,
};

const linkButtonStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: '44px',
  padding: '0.75rem 1.25rem',
  backgroundColor: '#0284c7',
  color: '#ffffff',
  borderRadius: '0.5rem',
  fontWeight: 600,
  fontSize: '1rem',
  textDecoration: 'none',
  boxSizing: 'border-box',
  transition: 'background-color 0.15s ease',
};

export const CONTACT_OPERATOR_URL = 'https://www.linkedin.com/in/kalyansmv/';

export function OperatorNoOperatorCard() {
  return (
    <div style={cardStyles} data-testid="no-operator-card">
      <div style={emojiStyles} role="img" aria-label="Friendly greeting">
        🙂
      </div>
      <h1 style={titleStyles}>No Operator</h1>
      <p style={subtitleStyles}>Please reach out to Kalyan V Medaboina for access.</p>
      <a
        href={CONTACT_OPERATOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={linkButtonStyles}
      >
        Contact Administrator ↗
      </a>
    </div>
  );
}
