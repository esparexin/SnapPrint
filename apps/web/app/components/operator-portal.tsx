'use client';

import React, { CSSProperties, useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError, fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { resolveStudioAuthorization } from '../../src/studio-authorization';
import { ModuleCards } from './module-cards';
import { OperatorPortalHeader } from './operator-portal-header';
import { PlatformScopeHub } from './platform-scope-hub';
import { PortalMembershipStatus } from './portal-membership-status';
import { PortalModals } from './portal-modals';
import { PortalUnauthenticated } from './portal-unauthenticated';
import { StudioSelector } from './studio-selector';
import { WorkspaceKpiBar } from './workspace-kpi-bar';

const portalStyles: Record<string, CSSProperties> = {
  wrapper: { width: '100%', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' },
  loading: { textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-family)' },
  alert: {
    padding: '0.75rem 1rem',
    background: '#fee2e2',
    border: '1px solid #f87171',
    borderRadius: '0.375rem',
    color: '#991b1b',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  sectionHeading: { fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' },
};

export interface OperatorPortalProps {
  initialMode?: 'password' | 'email_otp' | 'register';
}

export function OperatorPortal({ initialMode = 'email_otp' }: OperatorPortalProps = {}) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showPrintersModal, setShowPrintersModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => mounted && setAuth(user))
      .catch((err) => {
        if (mounted)
          setErrorBanner(
            err instanceof AuthApiError ? err.message : 'Session verification failed.'
          );
      })
      .finally(() => mounted && setLoading(false));
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
      setErrorBanner(err instanceof AuthApiError ? err.message : 'Logout encountered an error.');
    } finally {
      setLogoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div role="status" style={portalStyles.loading}>
        <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>Verifying operator session...</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <PortalUnauthenticated
        initialMode={initialMode}
        errorBanner={errorBanner}
        onSuccess={(newAuth) => {
          setAuth(newAuth);
          setErrorBanner(null);
        }}
      />
    );
  }

  const authState = resolveStudioAuthorization(auth, selectedStudioId);
  const isPlatformScope = authState.selectedStudioId === 'platform_scope';
  const activeStudioId =
    !isPlatformScope && authState.selectedStudioId ? authState.selectedStudioId : undefined;

  return (
    <div style={portalStyles.wrapper}>
      <OperatorPortalHeader
        userName={auth.user.name}
        userEmail={auth.user.email}
        isPlatformAdmin={auth.memberships.some(
          (m) => m.role === 'platform_admin' && m.status === 'active'
        )}
        logoutLoading={logoutLoading}
        onLogout={handleLogout}
      />

      {errorBanner && (
        <div role="alert" style={portalStyles.alert}>
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

          {isPlatformScope ? (
            <PlatformScopeHub onOpenWizard={() => setShowSetupModal(true)} />
          ) : (
            <>
              {activeStudioId && <WorkspaceKpiBar studioId={activeStudioId} />}
              <section>
                <h2 style={portalStyles.sectionHeading}>Studio Modules (Permission-Gated)</h2>
                <ModuleCards
                  can={authState.can}
                  onOpenQrModal={() => setShowQrModal(true)}
                  onOpenOrdersModal={() => setShowOrdersModal(true)}
                  onOpenSetupModal={() => setShowSetupModal(true)}
                  onOpenPrintersModal={() => setShowPrintersModal(true)}
                  onOpenStaffModal={() => setShowStaffModal(true)}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                  onOpenPaymentModal={() => setShowPaymentModal(true)}
                />
              </section>
            </>
          )}
        </div>
      )}

      <PortalModals
        studioId={activeStudioId}
        studioName={activeStudioId ? `Studio ${activeStudioId}` : undefined}
        showQrModal={showQrModal}
        showOrdersModal={showOrdersModal}
        showPrintersModal={showPrintersModal}
        showSetupModal={showSetupModal}
        showStaffModal={showStaffModal}
        showProfileModal={showProfileModal}
        showPaymentModal={showPaymentModal}
        onCloseQr={() => setShowQrModal(false)}
        onCloseOrders={() => setShowOrdersModal(false)}
        onClosePrinters={() => setShowPrintersModal(false)}
        onCloseSetup={() => setShowSetupModal(false)}
        onCloseStaff={() => setShowStaffModal(false)}
        onCloseProfile={() => setShowProfileModal(false)}
        onClosePayment={() => setShowPaymentModal(false)}
        onSetupComplete={async (saved) => {
          setShowSetupModal(false);
          const fresh = await fetchCurrentUser().catch(() => null);
          if (fresh) setAuth(fresh);
          if (saved?.id) setSelectedStudioId(saved.id);
        }}
      />
    </div>
  );
}
