'use client';

import React, { useEffect, useState } from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';
import { InfoModal } from './components/info-modal';
import { OperatorPortal } from './components/operator-portal';

export default function HomePage() {
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalMode, setPortalMode] = useState<'password' | 'email_otp' | 'register'>('email_otp');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'register') {
        setPortalMode('register');
        setShowPortalModal(true);
      }
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0284c7',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      <main
        style={{
          width: '100%',
          height: '100svh',
          position: 'relative',
        }}
      >
        <PushpinTearFooter
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
              src="/brand/snapprint-icon.png"
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
          topNav={[
            {
              label: 'About',
              href: '/about',
              variant: 'text',
            },
            {
              label: 'Login',
              onClick: () => {
                setPortalMode('email_otp');
                setShowPortalModal(true);
              },
              variant: 'text',
            },
            {
              label: 'Register',
              onClick: () => {
                setPortalMode('register');
                setShowPortalModal(true);
              },
              variant: 'button',
            },
          ]}
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
                Upload documents with automated dynamic pricing and print directly at your local
                store with <strong>zero WhatsApp privacy leaks</strong>.
              </span>
            </span>
          }
          columns={[]}
          sideLinks={[]}
          newsletter={null}
          credit=""
          copyright="© 2026 Palnadu.dev"
          footerLinks={[
            {
              label: 'Privacy Policy',
              onClick: () => setShowPrivacyModal(true),
            },
            {
              label: 'Terms & Conditions',
              onClick: () => setShowTermsModal(true),
            },
          ]}
        />
      </main>

      {showPortalModal && (
        <InfoModal onClose={() => setShowPortalModal(false)} maxWidth="420px">
          <OperatorPortal initialMode={portalMode} />
        </InfoModal>
      )}

      {showPrivacyModal && (
        <InfoModal title="Privacy Policy" onClose={() => setShowPrivacyModal(false)}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Zero WhatsApp Privacy Leaks:</strong> Customer files uploaded to SnapPrint
            auto-expire with a strict 120-minute TTL. No sensitive documents (Aadhaar cards, voter
            IDs, certificates) remain saved on studio computers or personal phones.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Encrypted Spool:</strong> Documents travel via TLS directly to the local printer
            spool queue and are permanently purged after printing.
          </p>
          <p>
            <strong>Network Trust:</strong> SnapPrint never shares or sells customer contact details
            or uploaded documents.
          </p>
        </InfoModal>
      )}

      {showTermsModal && (
        <InfoModal title="Terms & Conditions" onClose={() => setShowTermsModal(false)}>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Multi-Tenant Print Network:</strong> SnapPrint provides a digital counter Xerox
            and printing infrastructure connecting customers to authorized local studios.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>Transparent Pricing:</strong> Page count and color breakdown are dynamically
            calculated before payment. Quotations are strictly binding.
          </p>
          <p>
            <strong>Operator Agreement:</strong> Registered Xerox centers and studios agree to
            fulfill spool jobs promptly and maintain high print quality standards.
          </p>
        </InfoModal>
      )}
    </div>
  );
}
