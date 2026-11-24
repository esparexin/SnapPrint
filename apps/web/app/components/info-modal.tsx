'use client';

import React from 'react';
import { ModalSheetShell } from './modal-sheet-shell';

interface InfoModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function InfoModal({ title, onClose, children, maxWidth = '540px' }: InfoModalProps) {
  return (
    <ModalSheetShell
      onClose={onClose}
      titleId={title ? 'info-modal-title' : undefined}
      title={title}
      maxWidth={maxWidth}
    >
      <div style={{ padding: '1.5rem', fontSize: '0.92rem', lineHeight: 1.6, color: '#334155' }}>
        {children}
      </div>
    </ModalSheetShell>
  );
}
