'use client';

import React from 'react';
import { ConfirmModal } from './confirm-modal';

interface OrderDocumentPurgeModalProps {
  filename: string;
  purging: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function OrderDocumentPurgeModal({
  filename,
  purging,
  onConfirm,
  onClose,
}: OrderDocumentPurgeModalProps) {
  return (
    <ConfirmModal
      isOpen
      isNested
      title="Purge Document"
      message={
        <span>
          Permanently delete <strong>"{filename}"</strong> to protect customer privacy? This action
          cannot be undone.
        </span>
      }
      confirmLabel="Purge Document"
      cancelLabel="Cancel"
      variant="danger"
      isPending={purging}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
