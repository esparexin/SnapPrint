'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { AdminCreateUserModal } from './admin-create-user-modal';
import { AdminStatusModal } from './admin-status-modal';
import { AdminSubscriptionOverrideModal } from './admin-subscription-override-modal';
import { AdminTenantDetailsModal } from './admin-tenant-details-modal';

export interface AdminPortalModalsProps {
  selectedStudio: PlatformStudioItem | null;
  inspectStudio: PlatformStudioItem | null;
  overrideSubStudio?: PlatformStudioItem | null;
  showCreateAdmin: boolean;
  onCloseSelected: () => void;
  onCloseInspect: () => void;
  onCloseOverrideSub?: () => void;
  onCloseCreate: () => void;
  onReload: () => void;
}

export function AdminPortalModals({
  selectedStudio,
  inspectStudio,
  overrideSubStudio,
  showCreateAdmin,
  onCloseSelected,
  onCloseInspect,
  onCloseOverrideSub,
  onCloseCreate,
  onReload,
}: AdminPortalModalsProps) {
  return (
    <>
      {selectedStudio && (
        <AdminStatusModal
          studio={selectedStudio}
          isOpen
          onClose={onCloseSelected}
          onUpdated={onReload}
        />
      )}
      {inspectStudio && (
        <AdminTenantDetailsModal studio={inspectStudio} isOpen onClose={onCloseInspect} />
      )}
      {overrideSubStudio && (
        <AdminSubscriptionOverrideModal
          studioId={overrideSubStudio.id}
          studioName={overrideSubStudio.name}
          isOpen
          onClose={onCloseOverrideSub ?? (() => {})}
          onUpdated={onReload}
        />
      )}
      {showCreateAdmin && (
        <AdminCreateUserModal
          isOpen={showCreateAdmin}
          onClose={onCloseCreate}
          onCreated={onReload}
        />
      )}
    </>
  );
}
