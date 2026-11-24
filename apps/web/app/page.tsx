'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import PushpinTearFooter from '@/components/ui/pushpin-tear-footer';
import { fetchCurrentUser, logoutOperator } from '../src/auth-client';
import { buildHomeTopNav } from './components/home-nav-builder';
import { InfoModal } from './components/info-modal';
import { LegalModals } from './components/legal-modals';
import { OperatorPortal } from './components/operator-portal';

export default function HomePage() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalMode, setPortalMode] = useState<'password' | 'email_otp' | 'register'>('email_otp');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => mounted && setAuth(user))
      .catch(() => mounted && setAuth(null));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'register') {
        setPortalMode('register');
        setShowPortalModal(true);
      } else if (action === 'portal' || params.get('portal') === 'open') {
        setShowPortalModal(true);
      }
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logoutOperator().catch(() => {});
    setAuth(null);
    setShowPortalModal(false);
  };

  const topNav = buildHomeTopNav({
    auth,
    onOpenLogin: () => {
      setPortalMode('email_otp');
      setShowPortalModal(true);
    },
    onOpenRegister: () => {
      setPortalMode('register');
      setShowPortalModal(true);
    },
    onOpenPortal: () => setShowPortalModal(true),
    onLogout: handleLogout,
  });

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        background: 'linear-gradient(to bottom, #0284c7 50%, #ffffff 50%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <main style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
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
              href: '/privacy',
              onClick: () => setShowPrivacyModal(true),
            },
            {
              label: 'Terms & Conditions',
              href: '/terms',
              onClick: () => setShowTermsModal(true),
            },
            {
              label: 'Refund Policy',
              href: '/refunds',
            },
          ]}
        />
      </main>

      {showPortalModal && (
        <InfoModal onClose={() => setShowPortalModal(false)} maxWidth="420px">
          <OperatorPortal initialMode={portalMode} onAuthChange={(newAuth) => setAuth(newAuth)} />
        </InfoModal>
      )}

      <LegalModals
        showPrivacy={showPrivacyModal}
        showTerms={showTermsModal}
        onClosePrivacy={() => setShowPrivacyModal(false)}
        onCloseTerms={() => setShowTermsModal(false)}
      />
    </div>
  );
}
