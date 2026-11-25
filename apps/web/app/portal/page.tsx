'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthApiError, signOutToHome } from '../../src/auth-client';
import { OperatorPortal } from '../components/operator-portal';
import { portalStyles } from '../components/operator-portal-styles';

export default function PortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [initialMode, setInitialMode] = useState<'password' | 'email_otp' | 'register'>(
    'email_otp'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const action = new URLSearchParams(window.location.search).get('action');
      if (action === 'register') {
        setInitialMode('register');
      }
    }
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOutToHome();
      setIsAuthenticated(false);
    } catch (err) {
      setSignOutError(err instanceof AuthApiError ? err.message : 'Sign out encountered an error.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <header className="portal-topbar">
        <div className="portal-container portal-topbar-inner">
          <Link href="/" className="portal-brand-link">
            <img
              src="/favicon.png"
              alt="SnapPrint"
              style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'block' }}
            />
            <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>SnapPrint</span>
            <span className="portal-badge">Shop Portal</span>
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="portal-signout-btn"
            >
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          )}
        </div>
      </header>
      <main className="portal-container" style={{ paddingBlock: '1.25rem 2.5rem' }}>
        {signOutError && (
          <div role="alert" style={portalStyles.alert}>
            {signOutError}
          </div>
        )}
        <OperatorPortal
          initialMode={initialMode}
          hideHeaderSignOut
          onAuthChange={(u) => setIsAuthenticated(Boolean(u))}
        />
      </main>
    </div>
  );
}
