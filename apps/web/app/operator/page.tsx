'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { fetchCurrentUser } from '../../src/auth-client';
import { adminLayoutStyles } from '../admin/admin-layout-styles';
import { OperatorNoOperatorCard } from './operator-no-operator-card';

export default function OperatorPage() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setAuth(user);
        if (typeof window !== 'undefined' && user) {
          const isOperator = user.memberships.some(
            (m) => (m.role === 'studio_owner' || m.role === 'studio_staff') && m.status === 'active'
          );
          if (isOperator) {
            window.location.replace('/portal');
            return;
          }
          const isPlatformAdmin = user.memberships.some(
            (m) => m.role === 'platform_admin' && m.status === 'active'
          );
          if (isPlatformAdmin) {
            window.location.replace('/admin');
            return;
          }
        }
      })
      .catch(() => mounted && setAuth(null))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <div style={{ textAlign: 'center' }}>
          <div style={adminLayoutStyles.spinner} />
        </div>
      </div>
    );
  }

  const isOperator = auth?.memberships.some(
    (m) => (m.role === 'studio_owner' || m.role === 'studio_staff') && m.status === 'active'
  );

  if (!auth || !isOperator) {
    return (
      <div style={adminLayoutStyles.centeredScreen}>
        <OperatorNoOperatorCard />
      </div>
    );
  }

  return (
    <div style={adminLayoutStyles.centeredScreen}>
      <div style={{ textAlign: 'center' }}>
        <div style={adminLayoutStyles.spinner} />
      </div>
    </div>
  );
}
