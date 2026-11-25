'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError, fetchCurrentUser, signOutToHome } from '../../src/auth-client';
import { resolveStudioAuthorization } from '../../src/studio-authorization';
import { OperatorPortalHeader, OperatorView } from './operator-portal-header';
import { portalStyles } from './operator-portal-styles';
import { OperatorStudioHub } from './operator-studio-hub';
import { PlatformScopeHub } from './platform-scope-hub';
import { PortalMembershipStatus } from './portal-membership-status';
import { PortalModals } from './portal-modals';
import { PortalUnauthenticated } from './portal-unauthenticated';
import { StudioSelector } from './studio-selector';
import { useStudioNames } from './use-studio-names';

export interface OperatorPortalProps {
  initialMode?: 'password' | 'email_otp' | 'register';
  onAuthChange?: (auth: AuthResponse | null) => void;
  onClosePortal?: () => void;
  hideHeaderSignOut?: boolean;
}

const isActivePlatformAdmin = (user: AuthResponse | null) =>
  Boolean(user?.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active'));

export function OperatorPortal({
  initialMode = 'email_otp',
  onAuthChange,
  onClosePortal,
  hideHeaderSignOut = false,
}: OperatorPortalProps = {}) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<OperatorView>('orders');
  const [showPairingModal, setShowPairingModal] = useState(false);
  const studioNames = useStudioNames(auth?.memberships);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setAuth(user);
        if (isActivePlatformAdmin(user) && typeof window !== 'undefined') {
          window.location.href = '/admin';
          return;
        }
        onAuthChange?.(user);
      })
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
      await signOutToHome();
      setAuth(null);
      setSelectedStudioId(null);
      setActiveView('orders');
      onAuthChange?.(null);
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
          onAuthChange?.(newAuth);
          if (isActivePlatformAdmin(newAuth) && typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        }}
      />
    );
  }

  const authState = resolveStudioAuthorization(auth, selectedStudioId);
  const isPlatformScope = authState.selectedStudioId === 'platform_scope';
  const activeStudioId = !isPlatformScope ? authState.selectedStudioId || undefined : undefined;
  const activeStudioName = activeStudioId ? studioNames[activeStudioId] : undefined;
  const showStudioWorkspace =
    authState.uiState === 'ready' && !isPlatformScope && Boolean(activeStudioId);

  const handleSetupComplete = async (saved: { id?: string } | null) => {
    setActiveView('orders');
    const fresh = await fetchCurrentUser().catch(() => null);
    if (fresh) setAuth(fresh);
    if (saved?.id) setSelectedStudioId(saved.id);
  };

  return (
    <div style={portalStyles.wrapper}>
      <OperatorPortalHeader
        userName={auth.user.name}
        userEmail={auth.user.email}
        isPlatformAdmin={isActivePlatformAdmin(auth)}
        logoutLoading={logoutLoading}
        onLogout={handleLogout}
        hideSignOut={hideHeaderSignOut}
        onClosePortal={onClosePortal}
        studioName={activeStudioName}
        studioId={activeStudioId}
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
          onOpenWizard={() => setActiveView('setup')}
        />
      )}

      {authState.uiState === 'ready' && (
        <div>
          <StudioSelector
            activeMemberships={authState.activeMemberships}
            selectedStudioId={authState.selectedStudioId}
            onSelectStudio={setSelectedStudioId}
            effectiveRole={authState.effectiveRole}
            studioNames={studioNames}
          />
          {isPlatformScope ? (
            <PlatformScopeHub onOpenWizard={() => setActiveView('setup')} />
          ) : (
            <OperatorStudioHub
              studioId={activeStudioId}
              activeView={activeView}
              can={authState.can}
              onNavigate={setActiveView}
              onOpenPairing={() => setShowPairingModal(true)}
            />
          )}
        </div>
      )}

      {(showStudioWorkspace || activeView === 'setup') && (
        <PortalModals
          studioId={activeStudioId}
          studioName={activeStudioName || (activeStudioId ? `Studio ${activeStudioId}` : undefined)}
          activeView={activeView}
          inShell={showStudioWorkspace}
          showPairingModal={showPairingModal}
          onClosePairing={() => setShowPairingModal(false)}
          onBackToHub={() => setActiveView('orders')}
          onSetupComplete={handleSetupComplete}
        />
      )}
    </div>
  );
}
