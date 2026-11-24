'use client';

import React, { useState } from 'react';
import { PlatformStudioItem, StudioStatus } from '@snapprint/contracts';
import { updatePlatformStudioStatus } from '../../src/platform-admin-client';
import { useDialog } from '../hooks/use-dialog';
import { adminLayoutStyles } from './admin-layout-styles';
import { adminTableStyles } from './admin-table-styles';

export interface AdminStatusModalProps {
  studio: PlatformStudioItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: PlatformStudioItem) => void;
}

export function AdminStatusModal({ studio, isOpen, onClose, onUpdated }: AdminStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<StudioStatus>(studio.status);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen,
    onClose,
    enableSwipeDown: true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === studio.status) {
      onClose();
      return;
    }

    const requiresReason = selectedStatus === 'suspended' || selectedStatus === 'closed';
    if (requiresReason && reason.trim().length < 3) {
      setError('Please provide a reason of at least 3 characters for suspension/closure.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await updatePlatformStudioStatus(studio.id, {
        status: selectedStatus as 'active' | 'suspended' | 'pending_review' | 'closed',
        reason: reason.trim() || undefined,
      });
      onUpdated(res.studio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update studio status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-status-title"
      className="dialog-overlay"
      style={{ zIndex: 50 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={adminLayoutStyles.dialogBox}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={adminLayoutStyles.modalHeader}>
          <h3 id="admin-status-title" style={adminLayoutStyles.modalTitle}>Manage Studio Status</h3>
          <button
            type="button"
            onClick={onClose}
            style={adminLayoutStyles.modalCloseBtn}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
          Updating status for <strong style={{ color: '#0f172a' }}>{studio.name}</strong> (
          {studio.id}).
        </p>

        {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>Target Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StudioStatus)}
              style={adminTableStyles.formControl}
            >
              <option value="active">Active (Operational & Accepting Orders)</option>
              <option value="pending_review">Pending Review (Under Verification)</option>
              <option value="suspended">Suspended (Access Halted)</option>
              <option value="closed">Closed (Permanently Inactive)</option>
            </select>
          </div>

          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>
              Audit Reason{' '}
              {selectedStatus === 'suspended' || selectedStatus === 'closed' ? (
                <span style={{ color: '#dc2626' }}>*</span>
              ) : (
                <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
              )}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for this administrative action..."
              style={adminTableStyles.formTextarea}
            />
          </div>

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
        </form>
      </div>
    </div>
  );
}
