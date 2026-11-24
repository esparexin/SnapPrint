import React from 'react';
import { useDialog } from '../hooks/use-dialog';

interface InfoModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function InfoModal({ title, onClose, children, maxWidth = '540px' }: InfoModalProps) {
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'info-modal-title' : undefined}
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth, padding: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="dialog-close-btn"
          style={{ position: 'absolute', top: '1rem', right: '1rem' }}
        >
          ×
        </button>
        {title && (
          <h2 id="info-modal-title" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>
            {title}
          </h2>
        )}
        <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#334155' }}>{children}</div>
      </div>
    </div>
  );
}
