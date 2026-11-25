import { CSSProperties } from 'react';
import type { StudioPrintRatesContract } from '@snapprint/contracts';

export type OperatorView =
  | 'orders'
  | 'printer_setup'
  | 'qr'
  | 'profile'
  | 'payment'
  | 'staff'
  | 'setup'
  | 'subscription';

export const DEFAULT_A4_RATES: StudioPrintRatesContract = {
  A4: {
    black_and_white: { singleSidedMinor: 200, doubleSidedMinor: 300 },
    color: { singleSidedMinor: 1000, doubleSidedMinor: 1800 },
  },
};

export const getNoticeBoxStyle = (kind: 'error' | 'saved'): CSSProperties => ({
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '0.8125rem',
  marginBottom: '16px',
  backgroundColor: kind === 'saved' ? '#f0fdf4' : '#fef2f2',
  color: kind === 'saved' ? '#166534' : '#b91c1c',
  border: kind === 'saved' ? '1px solid #bbf7d0' : 'none',
});

export const VIEW_TITLES: Record<OperatorView, string> = {
  orders: 'Orders',
  printer_setup: 'Printer & Page Setup',
  qr: 'QR Stand',
  profile: 'Shop Settings',
  payment: 'Payments',
  staff: 'Staff',
  setup: 'Setup Guide',
  subscription: 'Subscription',
};

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
