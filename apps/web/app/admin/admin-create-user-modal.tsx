'use client';

import React, { useState } from 'react';
import { PlatformUserItem } from '@snapprint/contracts';
import { createPlatformAdminUser } from '../../src/platform-admin-client';
import { useDialog } from '../hooks/use-dialog';
import { adminLayoutStyles } from './admin-layout-styles';
import { adminTableStyles } from './admin-table-styles';

export interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (user: PlatformUserItem) => void;
}

export function AdminCreateUserModal({ isOpen, onClose, onCreated }: AdminCreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!name.trim() || !email.trim()) {
      setError('Name and valid email are required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await createPlatformAdminUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
      });
      onCreated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision platform admin user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-admin-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={adminLayoutStyles.dialogBox}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div style={adminLayoutStyles.modalHeader}>
          <h3 id="create-admin-title" style={adminLayoutStyles.modalTitle}>
            Provision Platform Admin
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={adminLayoutStyles.modalCloseBtn}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p
          style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.4 }}
        >
          Provision an authorized administrator account with platform-wide governance privileges.
        </p>

        {error && <div style={adminLayoutStyles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anand Kumar"
              style={{ ...adminTableStyles.formControl, fontSize: '1rem' }}
            />
          </div>

          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@snapprint.in"
              style={{ ...adminTableStyles.formControl, fontSize: '1rem' }}
            />
          </div>

          <div style={adminTableStyles.formGroup}>
            <label style={adminTableStyles.formLabel}>Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              style={{ ...adminTableStyles.formControl, fontSize: '1rem' }}
            />
          </div>

          <div style={adminLayoutStyles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ ...adminLayoutStyles.btnSecondary, minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ ...adminLayoutStyles.btnPrimary, minHeight: '44px' }}
            >
              {submitting ? 'Provisioning...' : 'Provision Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
