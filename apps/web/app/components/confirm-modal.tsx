'use client';

import React from 'react';
import { ModalSheetShell } from './modal-sheet-shell';

export interface ConfirmModalProps {
  isOpen?: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isPending?: boolean;
  isNested?: boolean;
  maxWidth?: string;
  hideCancel?: boolean;
  inShell?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen = true,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isPending = false,
  isNested = false,
  maxWidth = '460px',
  hideCancel = false,
  inShell = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const confirmBtnBg = variant === 'danger' ? '#dc2626' : '#0284c7';

  return (
    <ModalSheetShell
      isOpen={isOpen}
      isNested={isNested}
      inShell={inShell}
      onClose={onClose}
      titleId="confirm-modal-title"
      title={<span style={{ color: variant === 'danger' ? '#b91c1c' : '#0f172a' }}>{title}</span>}
      maxWidth={maxWidth}
      contentStyle={{ padding: '20px' }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          color: '#475569',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}
      >
        {message}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '6px',
        }}
      >
        {!hideCancel && (
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => onConfirm()}
          disabled={isPending}
          style={{
            minHeight: '44px',
            padding: '0 20px',
            borderRadius: '6px',
            backgroundColor: confirmBtnBg,
            color: '#ffffff',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </ModalSheetShell>
  );
}
