import React from 'react';

interface InfoModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function InfoModal({ title, onClose, children, maxWidth = '540px' }: InfoModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          color: '#0f172a',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Dialog"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            lineHeight: 1,
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          ×
        </button>
        {title && (
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h2>
        )}
        <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#334155' }}>{children}</div>
      </div>
    </div>
  );
}
