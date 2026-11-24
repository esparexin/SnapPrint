'use client';

import React, { useState } from 'react';
import { PlatformStudioItem, StudioStatus } from '@snapprint/contracts';
import { updatePlatformStudioStatus } from '../../src/platform-admin-client';
import { useDialog } from '../hooks/use-dialog';

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

    if (
      (selectedStatus === 'suspended' || selectedStatus === 'closed') &&
      reason.trim().length < 3
    ) {
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
      className="dialog-overlay"
      style={{ zIndex: 50 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '28rem', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Studio Status</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Updating status for <span className="font-semibold text-gray-900">{studio.name}</span> (
          {studio.id}).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StudioStatus)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="active">Active (Operational & Accepting Orders)</option>
              <option value="pending_review">Pending Review (Under Verification)</option>
              <option value="suspended">Suspended (Access Halted)</option>
              <option value="closed">Closed (Permanently Inactive)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audit Reason{' '}
              {selectedStatus === 'suspended' || selectedStatus === 'closed' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-400 font-normal">(Optional)</span>
              )}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for this administrative action..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
