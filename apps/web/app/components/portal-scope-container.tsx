'use client';

import React from 'react';
import { StudioAuthorizationState } from '../../src/studio-authorization';
import { PlatformScopeHub } from './platform-scope-hub';
import { PortalMembershipStatus } from './portal-membership-status';
import { StudioSelector } from './studio-selector';

interface PortalScopeContainerProps {
  authState: StudioAuthorizationState;
  selectedStudioId: string | null;
  studioNames: Record<string, string>;
  onResetStudio: () => void;
  onOpenWizard: () => void;
  onSelectStudio: (id: string | null) => void;
  children: React.ReactNode;
}

export function PortalScopeContainer({
  authState,
  selectedStudioId,
  studioNames,
  onResetStudio,
  onOpenWizard,
  onSelectStudio,
  children,
}: PortalScopeContainerProps) {
  if (authState.uiState === 'no_memberships' || authState.uiState === 'access_denied') {
    return (
      <PortalMembershipStatus
        uiState={authState.uiState}
        selectedStudioId={selectedStudioId}
        onResetStudio={onResetStudio}
        onOpenWizard={onOpenWizard}
      />
    );
  }

  if (authState.uiState !== 'ready') return null;

  return (
    <div>
      <StudioSelector
        activeMemberships={authState.activeMemberships}
        selectedStudioId={authState.selectedStudioId}
        onSelectStudio={onSelectStudio}
        effectiveRole={authState.effectiveRole}
        studioNames={studioNames}
      />
      {authState.selectedStudioId === 'platform_scope' ? (
        <PlatformScopeHub onOpenWizard={onOpenWizard} />
      ) : (
        children
      )}
    </div>
  );
}
