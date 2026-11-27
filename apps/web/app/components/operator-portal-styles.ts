import { CSSProperties } from 'react';

export type OperatorView =
  | 'orders'
  | 'printer_setup'
  | 'qr'
  | 'profile'
  | 'payment'
  | 'staff'
  | 'setup'
  | 'subscription';

export const getNoticeBoxStyle = (kind: 'error' | 'saved'): CSSProperties => ({
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '0.8125rem',
  marginBottom: '16px',
  backgroundColor: kind === 'saved' ? '#f0fdf4' : '#fef2f2',
  color: kind === 'saved' ? '#166534' : '#b91c1c',
  border: kind === 'saved' ? '1px solid #bbf7d0' : 'none',
});

export const portalStyles: Record<string, CSSProperties> = {
  wrapper: {
    width: '100%',
    maxWidth: '1040px',
    margin: '0 auto',
    fontFamily: 'var(--font-family)',
  },
  loading: { textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-family)' },
  alert: {
    padding: '0.75rem 1rem',
    background: '#fee2e2',
    border: '1px solid #f87171',
    borderRadius: '0.375rem',
    color: '#991b1b',
    marginBottom: '1.25rem',
    fontSize: '0.875rem',
  },
  sectionHeading: { fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' },
};

export const DUPLEX_BADGES: Record<string, { label: string; bg: string; fg: string }> = {
  supported: { label: '🔄 Duplex supported', bg: '#dcfce7', fg: '#166534' },
  unsupported: { label: '⇥ Simplex only', bg: '#f1f5f9', fg: '#475569' },
};
export const UNVERIFIED_DUPLEX = { label: '⚠️ Duplex unverified', bg: '#fef3c7', fg: '#92400e' };
export const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  active_bw: { bg: '#f0fdf4', color: '#166534' },
  active_color: { bg: '#eff6ff', color: '#1d4ed8' },
};

export const getTabBtnStyle = (isSelected: boolean): CSSProperties => ({
  minHeight: '44px',
  padding: '6px 12px',
  borderRadius: '6px',
  border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
  backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
  color: isSelected ? '#0369a1' : '#334155',
  fontWeight: isSelected ? 700 : 500,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const wizardBoxStyle: CSSProperties = {
  background: '#f8fafc',
  padding: '1rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
};
