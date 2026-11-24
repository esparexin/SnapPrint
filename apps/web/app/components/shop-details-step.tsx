'use client';

import React, { useState } from 'react';
import { generateAutoSlug, validateSlugSanity } from '@snapprint/domain';
import { validateOptionalIndianMobile } from '../../src/mobile-validator';
import {
  createStudio,
  StudioApiError,
  StudioOnboardingProfile,
  updateStudioProfile,
} from '../../src/studio-client';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: '0.25rem',
};

const DEFAULT_SHOP_PAYLOAD = {
  location: { state: 'Telangana' },
  capabilities: {
    autoPrintMaxPages: 30,
    isAutoPrintEnabled: true,
    supportsColor: true,
    supportsBlackAndWhite: true,
    supportedPaperSizes: ['A4'] as ('A4' | 'A3' | 'Letter')[],
  },
  payment: {
    enableCounterPayment: true,
    enableOnlinePayment: false,
    isRazorpayConfirmed: false,
  },
};

interface ShopDetailsStepProps {
  studioId?: string;
  initialValues?: {
    name?: string;
    slug?: string;
    tagline?: string;
    city?: string;
    phone?: string;
  };
  onSuccess: (studio: StudioOnboardingProfile) => void;
  onCancel?: () => void;
}

export function ShopDetailsStep({
  studioId,
  initialValues,
  onSuccess,
  onCancel,
}: ShopDetailsStepProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [slug, setSlug] = useState(initialValues?.slug || '');
  const [isSlugTouched, setIsSlugTouched] = useState(Boolean(initialValues?.slug));
  const [tagline, setTagline] = useState(initialValues?.tagline || '');
  const [city, setCity] = useState(initialValues?.city || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugSanity = slug ? validateSlugSanity(slug) : null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugTouched) {
      setSlug(generateAutoSlug(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugTouched(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Shop name must be at least 2 characters.');
      return;
    }
    if (!slugSanity?.valid) {
      setError(
        slugSanity?.reason || 'Please provide a valid slug (lowercase, letters and numbers).'
      );
      return;
    }
    if (city.trim().length < 2) {
      setError('City is required to activate your shop.');
      return;
    }
    const phoneError = validateOptionalIndianMobile(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setLoading(true);
    try {
      const commonFields = {
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || undefined,
        contactPhone: phone.trim() || undefined,
        location: { city: city.trim(), ...DEFAULT_SHOP_PAYLOAD.location },
      };

      if (studioId) {
        const updated = await updateStudioProfile(studioId, commonFields);
        onSuccess(updated);
      } else {
        const created = await createStudio({
          ...commonFields,
          capabilities: DEFAULT_SHOP_PAYLOAD.capabilities,
          payment: DEFAULT_SHOP_PAYLOAD.payment,
        });
        onSuccess(created);
      }
    } catch (err) {
      setError(err instanceof StudioApiError ? err.message : 'Failed to save shop details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="shop-name" style={labelStyle}>Shop Name *</label>
        <input id="shop-name" type="text" value={name} onChange={handleNameChange} placeholder="e.g. Ramesh Xerox & Stationery" required style={inputStyle} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="shop-slug" style={labelStyle}>Shop Web Slug * (Public customer URL)</label>
          {isSlugTouched && (
            <button
              type="button"
              onClick={() => { setSlug(generateAutoSlug(name)); setIsSlugTouched(false); }}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Auto-generate from name
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>/s/</span>
          <input id="shop-slug" type="text" value={slug} onChange={handleSlugChange} placeholder="ramesh-xerox" required style={{ ...inputStyle, flex: 1 }} />
        </div>
        {slug && !slugSanity?.valid && (
          <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{slugSanity?.reason}</p>
        )}
      </div>

      <div>
        <label htmlFor="shop-city" style={labelStyle}>City / Town *</label>
        <input id="shop-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" required style={inputStyle} />
      </div>

      <div>
        <label htmlFor="shop-phone" style={labelStyle}>Contact Phone (Optional)</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #d1d5db', borderRight: 'none', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569', userSelect: 'none' }}>+91</span>
          <input id="shop-phone" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10} value={phone} onChange={handlePhoneChange} placeholder="9876543210" style={{ ...inputStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1 }} />
        </div>
        {phone.length > 0 && phone.length < 10 && (
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>10-digit mobile number required ({10 - phone.length} more digits)</p>
        )}
      </div>

      <div>
        <label htmlFor="shop-tagline" style={labelStyle}>Tagline / Notice (Optional)</label>
        <input id="shop-tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Fast colour & B/W printing near Bus Stop" style={inputStyle} />
      </div>

      {error && (
        <div role="alert" style={{ padding: '0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || (slug.length > 0 && !slugSanity?.valid)}
          style={{ padding: '0.5rem 1.25rem', background: loading ? '#9ca3af' : '#0284c7', color: '#ffffff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </form>
  );
}
