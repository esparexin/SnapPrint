'use client';

import React, { useState } from 'react';
import { validateSlugSanity } from '@snapprint/domain';
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
  const [tagline, setTagline] = useState(initialValues?.tagline || '');
  const [city, setCity] = useState(initialValues?.city || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugSanity = slug ? validateSlugSanity(slug) : null;

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

    setLoading(true);
    try {
      if (studioId) {
        const updated = await updateStudioProfile(studioId, {
          name: name.trim(),
          slug: slug.trim(),
          tagline: tagline.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          location: { city: city.trim(), state: 'Telangana' },
        });
        onSuccess(updated);
      } else {
        const created = await createStudio({
          name: name.trim(),
          slug: slug.trim(),
          tagline: tagline.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          location: { city: city.trim(), state: 'Telangana' },
          capabilities: {
            autoPrintMaxPages: 30,
            isAutoPrintEnabled: true,
            supportsColor: true,
            supportsBlackAndWhite: true,
            supportedPaperSizes: ['A4'],
          },
          payment: {
            enableCounterPayment: true,
            enableOnlinePayment: false,
            isRazorpayConfirmed: false,
          },
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
        <label htmlFor="shop-name" style={labelStyle}>
          Shop Name *
        </label>
        <input
          id="shop-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ramesh Xerox & Stationery"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="shop-slug" style={labelStyle}>
          Shop Web Slug * (Public customer URL)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>/s/</span>
          <input
            id="shop-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="ramesh-xerox"
            required
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        {slug && !slugSanity?.valid && (
          <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
            {slugSanity?.reason}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="shop-city" style={labelStyle}>
          City / Town *
        </label>
        <input
          id="shop-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Hyderabad"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="shop-phone" style={labelStyle}>
          Contact Phone (Optional)
        </label>
        <input
          id="shop-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="shop-tagline" style={labelStyle}>
          Tagline / Notice (Optional)
        </label>
        <input
          id="shop-tagline"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="e.g. Fast colour & B/W printing near Bus Stop"
          style={inputStyle}
        />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.5rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.25rem',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              background: '#e5e7eb',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || (slug.length > 0 && !slugSanity?.valid)}
          style={{
            padding: '0.5rem 1.25rem',
            background: loading ? '#9ca3af' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </form>
  );
}
