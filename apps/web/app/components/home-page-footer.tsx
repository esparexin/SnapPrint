'use client';

import React from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';

export interface HomePageFooterProps {
  topNav: ReturnType<typeof import('./home-nav-builder').buildHomeTopNav>;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export function HomePageFooter({ topNav, onOpenPrivacy, onOpenTerms }: HomePageFooterProps) {
  return (
    <PushpinTearFooter
      height="100%"
      brand={
        <img
          src="/brand/snapprint-logo.png"
          alt="SnapPrint"
          style={{
            height: 'clamp(44px, 6.5cqmin, 62px)',
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      }
      name="Palnadu Print Network"
      logoHref="/"
      logo={
        <img
          src="/favicon.png"
          alt="SnapPrint"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      }
      sheet="#0284c7"
      paper="#ffffff"
      sheetInk="#ffffff"
      paperInk="#0f172a"
      seed={19}
      topNav={topNav}
      status={null}
      description={
        <span>
          <strong
            style={{
              display: 'block',
              fontSize: 'clamp(15px, 2cqmin, 19px)',
              fontWeight: 700,
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
            }}
          >
            Instant Digital Counter Xerox & Cloud Printing
          </strong>
          <span>
            Upload documents with automated dynamic pricing and print directly at your local store
            with <strong>zero WhatsApp privacy leaks</strong>.
          </span>
        </span>
      }
      columns={[]}
      sideLinks={[]}
      newsletter={null}
      credit=""
      copyright="© 2026 Palnadu.dev"
      footerLinks={[
        { label: 'Privacy Policy', href: '/privacy', onClick: onOpenPrivacy },
        { label: 'Terms & Conditions', href: '/terms', onClick: onOpenTerms },
        { label: 'Refund Policy', href: '/refunds' },
      ]}
    />
  );
}
