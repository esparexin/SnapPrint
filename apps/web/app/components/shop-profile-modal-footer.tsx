'use client';

import React from 'react';

interface ShopProfileModalFooterProps {
  saving: boolean;
  onClose: () => void;
}

export function ShopProfileModalFooter({ saving, onClose }: ShopProfileModalFooterProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          flex: 1,
          padding: '9px 14px',
          backgroundColor: '#f1f5f9',
          color: '#334155',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          flex: 1,
          padding: '9px 14px',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
