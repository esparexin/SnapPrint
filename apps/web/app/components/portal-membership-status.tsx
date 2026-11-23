'use client';

import React from 'react';

interface PortalMembershipStatusProps {
  uiState: 'no_memberships' | 'access_denied';
  selectedStudioId: string | null;
  onResetStudio: () => void;
  onOpenWizard?: () => void;
}

export function PortalMembershipStatus({
  uiState,
  selectedStudioId,
  onResetStudio,
  onOpenWizard,
}: PortalMembershipStatusProps) {
  if (uiState === 'no_memberships') {
    return (
      <div
        role="status"
        style={{
          padding: '1.5rem',
          background: '#f3f4f6',
          borderRadius: '0.5rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>No Active Studio Memberships</h2>
        <p style={{ color: '#4b5563', margin: '0 0 1rem' }}>
          Your operator account is active, but you have not yet set up a shop or been granted
          access.
        </p>
        {onOpenWizard && (
          <button
            type="button"
            onClick={onOpenWizard}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            + Register & Set Up Your Shop
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        padding: '1.5rem',
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1.25rem' }}>Access Denied</h2>
      <p style={{ color: '#78350f', margin: '0 0 1rem' }}>
        You do not have an active membership for studio "{selectedStudioId}".
      </p>
      <button
        type="button"
        onClick={onResetStudio}
        style={{
          padding: '0.375rem 0.75rem',
          background: '#d97706',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Reset to Authorized Studio
      </button>
    </div>
  );
}
