'use client';

import React from 'react';
import { adminLayoutStyles } from './admin-layout-styles';

interface AdminStatusActionsProps {
  submitting: boolean;
  onClose: () => void;
}

export function AdminStatusActions({ submitting, onClose }: AdminStatusActionsProps) {
  return (
    <div style={adminLayoutStyles.modalActions}>
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        style={adminLayoutStyles.btnSecondary}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        style={{ ...adminLayoutStyles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? 'Updating...' : 'Save Status'}
      </button>
    </div>
  );
}
