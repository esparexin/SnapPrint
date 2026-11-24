'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { validateOptionalIndianMobile } from '../../src/mobile-validator';
import { updateStudioProfile } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { ShopProfileFields } from './shop-profile-fields';

interface ShopProfileModalProps {
  studioId: string;
  studio: Studio;
  onClose: () => void;
  onUpdated: (updated: Studio) => void;
}

export function ShopProfileModal({ studioId, studio, onClose, onUpdated }: ShopProfileModalProps) {
  const [tagline, setTagline] = useState('');
  const [contactPhone, setContactPhone] = useState(studio.settings?.contactPhone || '');
  const [address, setAddress] = useState('');
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(
    studio.settings?.isAcceptingOrders ?? true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const phoneError = validateOptionalIndianMobile(contactPhone);
    if (phoneError) {
      setError(phoneError);
      setSaving(false);
      return;
    }
    try {
      const res = await updateStudioProfile(studioId, {
        tagline: tagline.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        isAcceptingOrders,
      });
      onUpdated(res.studio);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shop profile');
    } finally {
      setSaving(false);
    }
  };

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="dialog-overlay"
      style={{ zIndex: 60 }}
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '500px',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
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
              {studio.name} ({studio.slug})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dialog-close-btn"
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <ShopProfileFields
            isAcceptingOrders={isAcceptingOrders}
            setIsAcceptingOrders={setIsAcceptingOrders}
            tagline={tagline}
            setTagline={setTagline}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            address={address}
            setAddress={setAddress}
          />

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
        </form>
      </div>
    </div>
  );
}
