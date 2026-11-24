'use client';

import React from 'react';
import { useDialog } from '../hooks/use-dialog';
import { adminLayoutStyles } from './admin-layout-styles';
import { AdminSubscriptionOverrideForm } from './admin-subscription-override-form';

export interface AdminSubscriptionOverrideModalProps {
  studioId: string;
  studioName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function AdminSubscriptionOverrideModal({
  studioId,
  studioName,
  isOpen,
  onClose,
  onUpdated,
}: AdminSubscriptionOverrideModalProps) {
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen,
    onClose,
    enableSwipeDown: true,
  });
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-override-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ ...adminLayoutStyles.dialogBox, maxWidth: '28rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={adminLayoutStyles.modalHeader}>
          <h3 id="sub-override-title" style={adminLayoutStyles.modalTitle}>
            Extend / Override Subscription
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={adminLayoutStyles.modalCloseBtn}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
          Granting active period or extending plan for{' '}
          <strong style={{ color: '#0f172a' }}>{studioName}</strong>.
        </p>
        <AdminSubscriptionOverrideForm
          studioId={studioId}
          onSuccess={() => {
            onUpdated();
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
