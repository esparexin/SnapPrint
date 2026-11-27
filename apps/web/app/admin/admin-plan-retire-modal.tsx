'use client';

import React from 'react';
import { ConfirmModal } from '../components/confirm-modal';

interface AdminPlanRetireModalProps {
  planName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AdminPlanRetireModal({
  planName,
  deleting,
  onConfirm,
  onClose,
}: AdminPlanRetireModalProps) {
  return (
    <ConfirmModal
      isOpen
      title="Retire Subscription Plan"
      message={
        <span>
          Are you sure you want to delete or retire plan <strong>"{planName}"</strong>?
        </span>
      }
      confirmLabel="Retire Plan"
      cancelLabel="Cancel"
      variant="danger"
      isPending={deleting}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
