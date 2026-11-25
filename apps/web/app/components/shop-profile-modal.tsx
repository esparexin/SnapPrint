'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { validateOptionalIndianMobile } from '../../src/mobile-validator';
import { updateStudioProfile } from '../../src/workspace-client';
import { ModalSheetShell } from './modal-sheet-shell';
import { ShopProfileFields } from './shop-profile-fields';
import { ShopProfileModalFooter } from './shop-profile-modal-footer';
import { ShopProfileModalHeader } from './shop-profile-modal-header';

interface ShopProfileModalProps {
  studioId: string;
  studio: Studio;
  onClose: () => void;
  onUpdated: (updated: Studio) => void;
  inShell?: boolean;
}

export function ShopProfileModal({
  studioId,
  studio,
  onClose,
  onUpdated,
  inShell = false,
}: ShopProfileModalProps) {
  const [tagline, setTagline] = useState('');
  const [contactPhone, setContactPhone] = useState(studio.settings?.contactPhone || '');
  const [address, setAddress] = useState('');
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(
    studio.settings?.isAcceptingOrders ?? true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(false);
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
      if (inShell) setSavedNotice(true);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shop profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheetShell
      onClose={onClose}
      titleId="profile-modal-title"
      maxWidth="500px"
      inShell={inShell}
      hideCloseButton={true}
      contentStyle={{ padding: inShell ? '20px' : '24px' }}
    >
      <ShopProfileModalHeader
        studioName={studio.name}
        studioSlug={studio.slug}
        onClose={inShell ? undefined : onClose}
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

      {savedNotice && (
        <div
          role="status"
          style={{
            padding: '8px 12px',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            marginBottom: '16px',
          }}
        >
          ✓ Shop settings saved.
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

        <ShopProfileModalFooter saving={saving} onClose={inShell ? undefined : onClose} />
      </form>
    </ModalSheetShell>
  );
}
