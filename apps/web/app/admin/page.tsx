'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminNoAdminCard } from './admin-no-admin-card';
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
        </div>
      </div>
    );
  }

  const isPlatformAdmin = auth?.memberships.some(
    (m) => m.role === 'platform_admin' && m.status === 'active'
  );

  if (!auth || !isPlatformAdmin) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <AdminNoAdminCard />
      </div>
    );
  }

  return <AdminPortalView auth={auth} onLogout={handleLogout} />;
}
