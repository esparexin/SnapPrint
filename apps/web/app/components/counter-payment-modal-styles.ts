import { CSSProperties } from 'react';

export const counterPaymentModalStyles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  amountBox: {
    padding: '16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#334155',
  },
  errorBox: {
    padding: '10px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '8px',
  },
  btnCancel: {
    flex: 1,
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnConfirm: {
    flex: 2,
    padding: '10px 14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export function getMethodBtnStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    border: active ? '2px solid #16a34a' : '1px solid #cbd5e1',
    backgroundColor: active ? '#f0fdf4' : '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? 700 : 500,
    color: active ? '#15803d' : '#334155',
  };
}
