'use client';

import React from 'react';
import Link from 'next/link';
import { PublicStudio } from '@snapprint/contracts';
import { CustomerApiError } from '../../../src/customer-client';

export function CustomerStudioLoading() {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>
        Connecting to Studio...
      </div>
      <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
        Preparing your secure, account-free photo printing session.
      </p>
    </div>
  );
}

interface CustomerStudioErrorProps {
  slug: string;
  error: CustomerApiError | null;
}

export function CustomerStudioError({ slug, error }: CustomerStudioErrorProps) {
  const is404 = error?.statusCode === 404;
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
        {is404 ? 'Studio Not Found' : 'Unable to Connect'}
      </h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginTop: '12px', lineHeight: 1.6 }}>
        {is404
          ? `The studio '${slug}' could not be located. Please check the URL or scan an updated counter QR code.`
          : error?.message || 'An unexpected error occurred while connecting to the studio.'}
      </p>
      <div style={{ marginTop: '24px' }}>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

export function CustomerStudioInactive({ studio }: { studio: PublicStudio }) {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{studio.name}</h1>
      <div
        style={{
          margin: '24px auto',
          padding: '16px 20px',
          borderRadius: '8px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          color: '#b45309',
          fontSize: '15px',
          fontWeight: 500,
        }}
      >
        Studio is currently {studio.status} and not accepting orders.
      </div>
      <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
        Please contact the studio directly for assistance.
        {studio.contactPhone && (
          <span style={{ display: 'block', marginTop: '8px', fontWeight: 600 }}>
            Phone: {studio.contactPhone}
          </span>
        )}
      </p>
    </div>
  );
}

export function CustomerStudioHeader({
  studio,
}: {
  studio: { name: string; contactPhone?: string };
}) {
  return (
    <header style={{ marginBottom: '20px', textAlign: 'center' }}>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
          marginBottom: '10px',
        }}
      >
        <img
          src="/favicon.png"
          alt="SnapPrint"
          style={{ width: '22px', height: '22px', borderRadius: '6px' }}
        />
        <span
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#0284c7',
            letterSpacing: '-0.02em',
          }}
        >
          SnapPrint Network
        </span>
      </Link>
      <h1
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.5px',
          margin: '0 0 4px',
        }}
      >
        {studio.name}
      </h1>
      <div style={{ color: '#0284c7', fontSize: '14px', fontWeight: 600 }}>
        Xerox &amp; Digital Document Printing
      </div>
      {studio.contactPhone && (
        <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
          Shop Contact: {studio.contactPhone}
        </div>
      )}
    </header>
  );
}
