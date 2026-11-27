'use client';

import React, { useEffect, useState } from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError, fetchCurrentUser, signOutToHome } from '../../src/auth-client';
import { isActivePlatformAdmin, resolveStudioAuthorization } from '../../src/studio-authorization';
import { usePcAgentStatus } from '../hooks/use-pc-agent-status';
import { OperatorPortalHeader, OperatorView } from './operator-portal-header';
import { portalStyles } from './operator-portal-styles';
import { OperatorStudioHub } from './operator-studio-hub';
import { PortalModals } from './portal-modals';
import { PortalScopeContainer } from './portal-scope-container';
import { PortalUnauthenticated } from './portal-unauthenticated';
import { useStudioNames } from './use-studio-names';

export interface OperatorPortalProps {
  initialMode?: 'email_otp' | 'register';
  onAuthChange?: (auth: AuthResponse | null) => void;
  onStudioReadyChange?: (ready: boolean, isBound?: boolean) => void;
  openPairingSignal?: number;
  onClosePortal?: () => void;
  hideHeaderSignOut?: boolean;
}

export function OperatorPortal({
  initialMode = 'email_otp',
  onAuthChange,
  onStudioReadyChange,
  openPairingSignal,
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
  const [printerSetupTab, setPrinterSetupTab] = useState<'printers' | 'workstations' | 'sizes'>(
    'printers'
  );
  const studioNames = useStudioNames(auth?.memberships);

  const authState = auth ? resolveStudioAuthorization(auth, selectedStudioId) : null;
  const isPlatformScope = authState?.selectedStudioId === 'platform_scope';
  const activeStudioId = !isPlatformScope ? authState?.selectedStudioId || undefined : undefined;
  const activeStudioName = activeStudioId ? studioNames[activeStudioId] : undefined;
  const showStudioWorkspace = Boolean(
    authState && authState.uiState === 'ready' && !isPlatformScope && activeStudioId
  );
  const isPcBound = usePcAgentStatus(activeStudioId);

  const handleAuthSuccess = (user: AuthResponse) => {
    if (isActivePlatformAdmin(user) && typeof window !== 'undefined') {
      setLoading(true);
      window.location.replace('/admin');
      return;
    }
    setAuth(user);
    setErrorBanner(null);
    onAuthChange?.(user);
  };

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((user) => {
        if (mounted && user) {
          handleAuthSuccess(user);
          onAuthChange?.(user);
        }
      })
      .catch(
        (err) =>
          mounted &&
          setErrorBanner(err instanceof AuthApiError ? err.message : 'Session verification failed.')
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenPairingOrDetails = () => {
    if (isPcBound) {
      setActiveView('printer_setup');
      setPrinterSetupTab('workstations');
    } else {
      setShowPairingModal(true);
    }
  };

  useEffect(() => {
    if (openPairingSignal && openPairingSignal > 0) handleOpenPairingOrDetails();
  }, [openPairingSignal]);

  useEffect(() => {
    onStudioReadyChange?.(showStudioWorkspace, isPcBound);
  }, [showStudioWorkspace, isPcBound, onStudioReadyChange]);

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    setErrorBanner(null);
    signOutToHome()
      .catch((err) =>
        setErrorBanner(err instanceof AuthApiError ? err.message : 'Logout encountered an error.')
      )
      .finally(() => setLogoutLoading(false));
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
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (!authState) return null;

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
        isBound={isPcBound}
        onOpenPairing={handleOpenPairingOrDetails}
      />
      {errorBanner && (
        <div role="alert" style={portalStyles.alert}>
          {errorBanner}
        </div>
      )}
      <PortalScopeContainer
        authState={authState}
        selectedStudioId={selectedStudioId}
        studioNames={studioNames}
        onResetStudio={() => setSelectedStudioId(null)}
        onOpenWizard={() => setActiveView('setup')}
        onSelectStudio={setSelectedStudioId}
      >
        <OperatorStudioHub
          studioId={activeStudioId}
          activeView={activeView}
          can={authState.can}
          onNavigate={setActiveView}
        />
      </PortalScopeContainer>
      {(showStudioWorkspace || activeView === 'setup') && (
        <PortalModals
          studioId={activeStudioId}
          studioName={activeStudioName || (activeStudioId ? `Studio ${activeStudioId}` : undefined)}
          activeView={activeView}
          inShell={showStudioWorkspace}
          showPairingModal={showPairingModal}
          initialPrinterTab={printerSetupTab}
          onClosePairing={() => setShowPairingModal(false)}
          onBackToHub={() => setActiveView('orders')}
          onSetupComplete={async (saved) => {
            setActiveView('orders');
            const fresh = await fetchCurrentUser().catch(() => null);
            if (fresh) setAuth(fresh);
            if (saved?.id) setSelectedStudioId(saved.id);
          }}
        />
      )}
    </div>
  );
}
