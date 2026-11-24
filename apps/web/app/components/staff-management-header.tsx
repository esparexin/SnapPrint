'use client';

import React from 'react';

interface StaffManagementHeaderProps {
  studioName?: string;
  onClose: () => void;
}

export function StaffManagementHeader({ studioName, onClose }: StaffManagementHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <h2
          id="staff-modal-title"
          style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
        >
          Staff & Permissions
        </h2>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
          {studioName || 'Studio Workspace'}
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
        ✕
      </button>
    </div>
  );
}
