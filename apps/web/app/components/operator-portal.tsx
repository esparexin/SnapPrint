'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError, fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { resolveStudioAuthorization } from '../../src/studio-authorization';
import { ModuleCards } from './module-cards';
import { OrderFulfillmentModal } from './order-fulfillment-modal';
import { PortalMembershipStatus } from './portal-membership-status';
import { PortalUnauthenticated } from './portal-unauthenticated';
import { ShopSetupWizard } from './shop-setup-wizard';
import { StudioQrModal } from './studio-qr-modal';
import { StudioSelector } from './studio-selector';

export function OperatorPortal() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function hydrateSession() {
      try {
        const currentAuth = await fetchCurrentUser();
        if (mounted) setAuth(currentAuth);
      } catch (err) {
        if (mounted) {
          setErrorBanner(
            err instanceof AuthApiError
              ? err.message
              : 'Failed to verify session status. Check network connection.'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    hydrateSession();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setErrorBanner(null);
    try {
      await logoutOperator();
      setAuth(null);
      setSelectedStudioId(null);
    } catch (err) {
      setErrorBanner(
        err instanceof AuthApiError ? err.message : 'Logout encountered an error. Please try again.'
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        style={{ textAlign: 'center', padding: '3rem', fontFamily: 'system-ui, sans-serif' }}
      >
        <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>
          Verifying operator authentication session...
        </p>
      </div>
    );
  }

  if (!auth) {
    return (
      <PortalUnauthenticated
        errorBanner={errorBanner}
        onSuccess={(newAuth) => {
          setAuth(newAuth);
          setErrorBanner(null);
        }}
      />
    );
  }

  const authState = resolveStudioAuthorization(auth, selectedStudioId);

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            SnapPrint Operator Portal
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            Signed in as <strong>{auth.user.name}</strong> ({auth.user.email})
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutLoading}
          style={{
            padding: '0.5rem 1rem',
            background: logoutLoading ? '#9ca3af' : '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: logoutLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {logoutLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </header>

      {errorBanner && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            background: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '0.375rem',
            color: '#991b1b',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          {errorBanner}
        </div>
      )}

      {(authState.uiState === 'no_memberships' || authState.uiState === 'access_denied') && (
        <PortalMembershipStatus
          uiState={authState.uiState}
          selectedStudioId={selectedStudioId}
          onResetStudio={() => setSelectedStudioId(null)}
          onOpenWizard={() => setShowSetupModal(true)}
        />
      )}

      {authState.uiState === 'ready' && (
        <div>
          <StudioSelector
            activeMemberships={authState.activeMemberships}
            selectedStudioId={authState.selectedStudioId}
            onSelectStudio={setSelectedStudioId}
            effectiveRole={authState.effectiveRole}
          />

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' }}>
              Studio Modules (Permission-Gated)
            </h2>
            <ModuleCards
              can={authState.can}
              onOpenQrModal={() => setShowQrModal(true)}
              onOpenOrdersModal={() => setShowOrdersModal(true)}
              onOpenSetupModal={() => setShowSetupModal(true)}
            />
          </section>

          {showQrModal && authState.selectedStudioId && (
            <StudioQrModal
              studio={{
                id: authState.selectedStudioId,
                slug: authState.selectedStudioId.replace(/^studio_/, '').replace(/_/g, '-'),
                name: `Studio ${authState.selectedStudioId}`,
              }}
              onClose={() => setShowQrModal(false)}
            />
          )}

          {showOrdersModal && authState.selectedStudioId && (
            <OrderFulfillmentModal
              studioId={authState.selectedStudioId}
              studioName={`Studio ${authState.selectedStudioId}`}
              onClose={() => setShowOrdersModal(false)}
            />
          )}
        </div>
      )}

      {showSetupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
            overflowY: 'auto',
          }}
        >
          <div style={{ maxWidth: '620px', width: '100%', margin: 'auto' }}>
            <ShopSetupWizard
              initialStudio={
                authState.selectedStudioId ? { id: authState.selectedStudioId } : undefined
              }
              onComplete={async (saved) => {
                setShowSetupModal(false);
                const fresh = await fetchCurrentUser().catch(() => null);
                if (fresh) setAuth(fresh);
                if (saved?.id) setSelectedStudioId(saved.id);
              }}
              onCancel={() => setShowSetupModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
