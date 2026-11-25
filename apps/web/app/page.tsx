'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser, logoutOperator } from '../src/auth-client';
import { HomePageFooter } from './components/home-page-footer';
import { buildHomeTopNav } from './components/home-nav-builder';
import { LegalModals } from './components/legal-modals';

export default function HomePage() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('action') === 'register') {
      window.location.href = '/portal?action=register';
      return;
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
        if (params?.get('action') === 'portal' || params?.get('portal') === 'open') {
          window.location.href = '/portal';
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logoutOperator().catch(() => {});
    setAuth(null);
  };

  const topNav = buildHomeTopNav({
    auth,
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

      <LegalModals
        showPrivacy={showPrivacyModal}
        showTerms={showTermsModal}
        onClosePrivacy={() => setShowPrivacyModal(false)}
        onCloseTerms={() => setShowTermsModal(false)}
      />
    </div>
  );
}
