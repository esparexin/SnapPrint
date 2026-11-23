'use client';

import React, { useState } from 'react';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';
import { InfoModal } from './components/info-modal';
import { OperatorPortal } from './components/operator-portal';

export default function HomePage() {
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
              label: 'About',
              onClick: () => setShowAboutModal(true),
              variant: 'text',
            },
            {
              label: 'Login',
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
          description="Instant digital counter Xerox & cloud printing network. Upload your documents with dynamic price calculation, and print directly at your local store with zero WhatsApp privacy leaks."
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

      {showAboutModal && (
        <InfoModal title="About SnapPrint" onClose={() => setShowAboutModal(false)}>
          <div style={{ display: 'grid', gap: '0.85rem', color: '#334155' }}>
            <div>
              <h3
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  margin: '0 0 0.2rem',
                  color: '#0f172a',
                }}
              >
                What is SnapPrint?
              </h3>
              <p style={{ margin: 0 }}>
                SnapPrint is a privacy-first digital counter Xerox and document printing network by
                Palnadu.dev connecting users directly to verified local print shops and Xerox
                centers.
              </p>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  margin: '0 0 0.2rem',
                  color: '#0f172a',
                }}
              >
                How It Works
              </h3>
              <p style={{ margin: 0 }}>
                1. Scan the store counter QR code at any SnapPrint partner shop.
                <br />
                2. Upload documents or photos with automated page count and color pricing.
                <br />
                3. Your print job spools securely to the shop printer and auto-expires in 120
                minutes.
              </p>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  margin: '0 0 0.2rem',
                  color: '#0f172a',
                }}
              >
                Why SnapPrint?
              </h3>
              <p style={{ margin: 0 }}>
                Zero WhatsApp privacy leaks — sensitive Aadhaar cards, certificates, and personal
                photos never stay saved on shopkeeper phones or store computers.
              </p>
            </div>
            <div style={{ paddingTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAboutModal(false);
                  setShowPortalModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                Register Your Store / Printer →
              </button>
            </div>
          </div>
        </InfoModal>
      )}

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
