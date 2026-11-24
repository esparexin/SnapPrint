import { CSSProperties } from 'react';

export const adminModalStyles: Record<string, CSSProperties> = {
  dialogBox: {
    maxWidth: '28rem',
    padding: '1.5rem',
    fontFamily: 'var(--font-family)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#94a3b8',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
    padding: 0,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '0.5rem',
  },
};
