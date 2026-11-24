import React from 'react';
import Link from 'next/link';

export function ErrorHeader({
  actionHref,
  actionText,
  isRawHtml = false,
}: {
  actionHref?: string;
  actionText?: string;
  isRawHtml?: boolean;
}) {
  const brandContent = (
    <>
      <img
        src="/favicon.png"
        alt="SnapPrint"
        style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'block' }}
      />
      <span
        style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.025em',
        }}
      >
        SnapPrint
      </span>
    </>
  );

  return (
    <header
      style={{
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {isRawHtml ? (
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
          >
            {brandContent}
          </a>
        ) : (
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
          >
            {brandContent}
          </Link>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {isRawHtml ? (
            <a
              href="/"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              Home
            </a>
          ) : (
            <Link
              href="/"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              Home
            </Link>
          )}
          {actionHref &&
            actionText &&
            (isRawHtml ? (
              <a href={actionHref} style={primaryActionStyle}>
                {actionText}
              </a>
            ) : (
              <Link href={actionHref} style={primaryActionStyle}>
                {actionText}
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}

export function ErrorFooter({ isRawHtml = false }: { isRawHtml?: boolean }) {
  return (
    <footer
      style={{
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        padding: '1.25rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#64748b',
        }}
      >
        <span>© 2026 SnapPrint Technologies</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {isRawHtml ? (
            <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
              Home
            </a>
          ) : (
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
              Home
            </Link>
          )}
          <a
            href="https://www.palnadu.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}
          >
            Developed by Palnadu.dev
          </a>
        </div>
      </div>
    </footer>
  );
}

const primaryActionStyle: React.CSSProperties = {
  padding: '0.45rem 1.1rem',
  borderRadius: '99px',
  backgroundColor: '#0284c7',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
};
