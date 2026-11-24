'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { AdminCreateUserModal } from './admin-create-user-modal';
import { AdminStatusModal } from './admin-status-modal';
import { AdminTenantDetailsModal } from './admin-tenant-details-modal';

export interface AdminPortalModalsProps {
  selectedStudio: PlatformStudioItem | null;
  inspectStudio: PlatformStudioItem | null;
  showCreateAdmin: boolean;
  onCloseSelected: () => void;
  onCloseInspect: () => void;
  onCloseCreate: () => void;
  onReload: () => void;
}

export function AdminPortalModals({
  selectedStudio,
  inspectStudio,
  showCreateAdmin,
  onCloseSelected,
  onCloseInspect,
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
