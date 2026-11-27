'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { ConfirmModal } from '../components/confirm-modal';

interface AdminSubscriptionNotifyModalsProps {
  pendingStudio: PlatformStudioItem | null;
  notifying: boolean;
  notifyError: string | null;
  onConfirmNotify: () => void;
  onCancelNotify: () => void;
  onClearError: () => void;
}

export function AdminSubscriptionNotifyModals({
  pendingStudio,
  notifying,
  notifyError,
  onConfirmNotify,
  onCancelNotify,
  onClearError,
}: AdminSubscriptionNotifyModalsProps) {
  return (
    <>
      {pendingStudio && (
        <ConfirmModal
          isOpen
          title="Send Subscription Notice"
          message={
            <span>
              Trigger subscription notice email for <strong>"{pendingStudio.name}"</strong>?
            </span>
          }
          confirmLabel="Send Notice"
          cancelLabel="Cancel"
          variant="primary"
          isPending={notifying}
          onConfirm={onConfirmNotify}
          onClose={onCancelNotify}
        />
      )}
      {notifyError && (
        <ConfirmModal
          isOpen
          title="Notification Error"
          message={<span>{notifyError}</span>}
          confirmLabel="OK"
          hideCancel
          variant="danger"
          onConfirm={onClearError}
          onClose={onClearError}
        />
      )}
    </>
  );
}
