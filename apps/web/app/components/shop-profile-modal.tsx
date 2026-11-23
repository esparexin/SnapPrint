'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { updateStudioProfile } from '../../src/workspace-client';

interface ShopProfileModalProps {
  studioId: string;
  studio: Studio;
  onClose: () => void;
  onUpdated: (updated: Studio) => void;
}

export function ShopProfileModal({
  studioId,
  studio,
  onClose,
  onUpdated,
}: ShopProfileModalProps) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 60,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 id="profile-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Shop Profile & Operations
            </h2>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {studio.name} ({studio.slug})
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Pause / Resume Control */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: isAcceptingOrders ? '1px solid #bbf7d0' : '1px solid #fecdd3',
              backgroundColor: isAcceptingOrders ? '#f0fdf4' : '#fff1f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isAcceptingOrders ? '#166534' : '#9f1239', display: 'block' }}>
                {isAcceptingOrders ? '● Accepting Customer Orders' : '⏸ Orders Paused'}
              </span>
              <span style={{ fontSize: '0.75rem', color: isAcceptingOrders ? '#15803d' : '#be123c' }}>
                {isAcceptingOrders ? 'Shop is active for uploads on /s/[slug]' : 'Uploads temporarily disabled for customers'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAcceptingOrders(!isAcceptingOrders)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                backgroundColor: isAcceptingOrders ? '#e11d48' : '#16a34a',
                color: '#ffffff',
              }}
            >
              {isAcceptingOrders ? 'Pause Orders' : 'Resume Orders'}
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Shop Tagline
            </label>
            <input
              type="text"
              placeholder="e.g. Fast A4 Xerox & High-Speed Prints"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Customer Support Phone
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98765 43210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Counter Location Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop #4, Main Road, Hanamkonda"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '0.875rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

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
