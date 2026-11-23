'use client';

import React, { useState } from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';
import { InfoModal } from './components/info-modal';
import { OperatorPortal } from './components/operator-portal';

export default function HomePage() {
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0284c7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '1440px',
          height: '100svh',
          position: 'relative',
        }}
      >
        <PushpinTearFooter
          brand="SnapPrint"
          name="Palnadu Print Network"
          logoHref="/"
          sheet="#0284c7"
          paper="#ffffff"
          sheetInk="#ffffff"
          paperInk="#0f172a"
          seed={19}
          topNav={[
            {
              label: 'Studio Login',
              onClick: () => setShowPortalModal(true),
              variant: 'text',
            },
            {
              label: 'Register',
              onClick: () => setShowPortalModal(true),
              variant: 'button',
            },
          ]}
          status={{ label: 'accepting digital xerox orders' }}
          columns={[
            {
              title: 'print services',
              links: [
                { label: 'B&W Xerox & Document Print', href: '/s/demo' },
                { label: 'Color Photo Printing', href: '/s/demo' },
                { label: 'Duplex Document Xerox', href: '/s/demo' },
              ],
            },
            {
              title: 'operator portal',
              links: [
                { label: 'Studio Login', onClick: () => setShowPortalModal(true) },
                { label: 'Register Xerox Center', onClick: () => setShowPortalModal(true) },
              ],
            },
          ]}
          sideLinks={[
            {
              icon: 'shield',
              label: 'privacy policy',
              onClick: () => setShowPrivacyModal(true),
            },
            {
              icon: 'doc',
              label: 'terms & conditions',
              onClick: () => setShowTermsModal(true),
            },
          ]}
          copyright="© 2026 SnapPrint Technologies"
          credit="multi-tenant print network"
          handle={{ label: '@snapprint', href: 'https://print.palnadu.dev' }}
        />
      </main>

      {showPortalModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowPortalModal(false)}
              aria-label="Close Dialog"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                lineHeight: 1,
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              ×
            </button>
            <OperatorPortal />
          </div>
        </div>
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
