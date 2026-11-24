import { CSSProperties } from 'react';

export type OperatorView =
  | 'hub'
  | 'orders'
  | 'printers'
  | 'qr'
  | 'profile'
  | 'payment'
  | 'staff'
  | 'setup';

export const VIEW_TITLES: Record<OperatorView, string> = {
  hub: 'Operator Portal',
  orders: 'Orders',
  printers: 'Printers',
  qr: 'QR Stand',
  profile: 'Shop Settings',
  payment: 'Payments',
  staff: 'Staff',
  setup: 'Setup Guide',
};

export const portalStyles: Record<string, CSSProperties> = {
  wrapper: { width: '100%', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' },
  loading: { textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-family)' },
  alert: {
    padding: '0.75rem 1rem',
    background: '#fee2e2',
    border: '1px solid #f87171',
    borderRadius: '0.375rem',
    color: '#991b1b',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  sectionHeading: { fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem' },
};
