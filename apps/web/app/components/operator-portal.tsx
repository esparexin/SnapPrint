'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError, fetchCurrentUser, logoutOperator } from '../../src/auth-client';
import { resolveStudioAuthorization } from '../../src/studio-authorization';
import { OperatorPortalHeader, OperatorView } from './operator-portal-header';
import { OperatorStudioHub } from './operator-studio-hub';
import { PlatformScopeHub } from './platform-scope-hub';
import { PortalMembershipStatus } from './portal-membership-status';
import { PortalModals } from './portal-modals';
import { PortalUnauthenticated } from './portal-unauthenticated';
import { StudioSelector } from './studio-selector';
import { useStudioNames } from './use-studio-names';
import { portalStyles } from './operator-portal-styles';

export interface OperatorPortalProps {
  initialMode?: 'password' | 'email_otp' | 'register';
  onAuthChange?: (auth: AuthResponse | null) => void;
  onClosePortal?: () => void;
}

export function OperatorPortal({
  initialMode = 'email_otp',
  onAuthChange,
  onClosePortal,
}: OperatorPortalProps = {}) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<OperatorView>('hub');

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (!mounted) return;
        setAuth(user);
        const isSuper = user?.memberships.some(
          (m) => m.role === 'platform_admin' && m.status === 'active'
        );
        if (isSuper && typeof window !== 'undefined') window.location.href = '/admin';
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
      await logoutOperator();
      setAuth(null);
      setSelectedStudioId(null);
      setActiveView('hub');
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
          const isSuper = newAuth.memberships.some(
            (m) => m.role === 'platform_admin' && m.status === 'active'
          );
          if (isSuper && typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        }}
      />
    );
  }

  const authState = resolveStudioAuthorization(auth, selectedStudioId);
  const studioNames = useStudioNames(auth?.memberships);
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
        activeView={activeView}
        onNavigate={setActiveView}
        onClosePortal={onClosePortal}
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
          {activeView === 'hub' ? (
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
                  can={authState.can}
                  onNavigate={setActiveView}
                />
              )}
            </div>
          ) : (
            <PortalModals
              studioId={activeStudioId}
              studioName={
                activeStudioId
                  ? studioNames[activeStudioId] || `Studio ${activeStudioId}`
                  : undefined
              }
              activeView={activeView}
              onBackToHub={() => setActiveView('hub')}
              onSetupComplete={async (saved) => {
                setActiveView('hub');
                const fresh = await fetchCurrentUser().catch(() => null);
                if (fresh) setAuth(fresh);
                if (saved?.id) setSelectedStudioId(saved.id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
