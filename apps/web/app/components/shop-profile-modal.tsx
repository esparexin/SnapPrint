'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { validateOptionalIndianMobile } from '../../src/mobile-validator';
import { updateStudioProfile } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { ShopProfileFields } from './shop-profile-fields';
import { ShopProfileModalFooter } from './shop-profile-modal-footer';
import { ShopProfileModalHeader } from './shop-profile-modal-header';

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
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '500px', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <ShopProfileModalHeader
          studioName={studio.name}
          studioSlug={studio.slug}
          onClose={onClose}
        />

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

          <ShopProfileModalFooter saving={saving} onClose={onClose} />
        </form>
      </div>
    </div>
  );
}
