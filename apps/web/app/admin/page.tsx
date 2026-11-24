'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminPortalView } from './admin-portal-view';

export default function PlatformAdminPage() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => mounted && setAuth(user))
      .catch(() => mounted && setAuth(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logoutOperator().catch(() => {});
    setAuth(null);
  };

  if (loading) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <div style={{ textAlign: 'center' }}>
          <div style={adminLayoutStyles.spinner} />
          <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
            Verifying admin credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <div style={adminLayoutStyles.authCard}>
          <div style={adminLayoutStyles.authIcon}>SP</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Platform Administration
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem' }}>
            Authentication is required to access the SnapPrint administrative governance portal.
          </p>
          <Link href="/" style={adminLayoutStyles.btnBlock}>
            Sign In with Admin Account
          </Link>
        </div>
      </div>
    );
  }

  const isPlatformAdmin = auth.memberships.some(
    (m) => m.role === 'platform_admin' && m.status === 'active'
  );

  if (!isPlatformAdmin) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <div style={{ ...adminLayoutStyles.authCard, borderColor: '#fecaca' }}>
          <div style={adminLayoutStyles.errorIcon}>!</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Access Denied (403)
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.5rem' }}>
            Your account ({auth.user.email}) does not possess the{' '}
            <code style={adminLayoutStyles.codePill}>platform_admin</code> role required to access
            this workspace.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/" style={adminLayoutStyles.btnBlock}>
              Return to Shop Workspace
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={adminLayoutStyles.btnBlockSecondary}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPortalView auth={auth} onLogout={handleLogout} />;
}
