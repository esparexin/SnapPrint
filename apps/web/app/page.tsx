'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser, logoutOperator } from '../src/auth-client';
import { HomePageFooter } from './components/home-page-footer';
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
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('action') === 'register') {
      setPortalMode('register');
      setShowPortalModal(true);
    }
    fetchCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setAuth(user);
        const isSuper = user?.memberships.some(
          (m) => m.role === 'platform_admin' && m.status === 'active'
        );
        if (params?.get('action') === 'portal' || params?.get('portal') === 'open') {
          window.location.href = isSuper ? '/admin' : '/portal';
        }
      })
      .catch(() => {
        if (!mounted) return;
        setAuth(null);
        if (params?.get('action') === 'portal' || params?.get('portal') === 'open')
          setShowPortalModal(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openPortalWithMode = (mode: 'email_otp' | 'register') => {
    setPortalMode(mode);
    setShowPortalModal(true);
  };

  const handleLogout = async () => {
    await logoutOperator().catch(() => {});
    setAuth(null);
    setShowPortalModal(false);
  };

  const topNav = buildHomeTopNav({
    auth,
    onOpenLogin: () => openPortalWithMode('email_otp'),
    onOpenRegister: () => openPortalWithMode('register'),
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
        <HomePageFooter
          topNav={topNav}
          onOpenPrivacy={() => setShowPrivacyModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
        />
      </main>

      {showPortalModal && (
        <InfoModal onClose={() => setShowPortalModal(false)} maxWidth={auth ? '960px' : '420px'}>
          <OperatorPortal initialMode={portalMode} onAuthChange={setAuth} />
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
