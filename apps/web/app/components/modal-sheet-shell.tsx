'use client';

import React, { CSSProperties, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/use-dialog';

export interface ModalSheetShellProps {
  isOpen?: boolean;
  onClose: () => void;
  titleId?: string;
  title?: React.ReactNode;
  maxWidth?: string;
  isNested?: boolean;
  enableSwipeDown?: boolean;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  contentStyle?: CSSProperties;
  dialogId?: string;
}

export function ModalSheetShell({
  isOpen = true,
  onClose,
  titleId,
  title,
  maxWidth = '540px',
  isNested = false,
  enableSwipeDown = true,
  children,
  headerActions,
  contentStyle,
  dialogId,
}: ModalSheetShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen,
    onClose,
    enableSwipeDown,
    dialogId,
  });

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`dialog-overlay${isNested ? ' dialog-overlay-nested' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth, ...contentStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {title ? (
          <div
            {...swipeHandlers}
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              {typeof title === 'string' ? (
                <h3
                  id={titleId}
                  style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}
                >
                  {title}
                </h3>
              ) : (
                title
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="dialog-close-btn"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dialog-close-btn"
            style={{ position: 'absolute', top: '1rem', right: '1rem' }}
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
