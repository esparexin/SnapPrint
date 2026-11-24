'use client';

import React from 'react';

interface ShopProfileModalHeaderProps {
  studioName: string;
  studioSlug: string;
  onClose: () => void;
}

export function ShopProfileModalHeader({
  studioName,
  studioSlug,
  onClose,
}: ShopProfileModalHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <div>
        <h2
          id="profile-modal-title"
          style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
        >
          Shop Profile & Operations
        </h2>
        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {studioName} ({studioSlug})
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
        ✕
      </button>
    </div>
  );
}
