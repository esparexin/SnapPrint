'use client';

import React, { useState } from 'react';
import { PaperSize } from '@snapprint/contracts';
import { generateAutoSlug, validateSlugSanity } from '@snapprint/domain';
import { validateOptionalIndianMobile } from '../../src/mobile-validator';
import {
  createStudio,
  StudioApiError,
  StudioOnboardingProfile,
  updateStudioProfile,
} from '../../src/studio-client';
import { ShopDetailsFormFields } from './shop-details-form-fields';

const DEFAULT_SHOP_PAYLOAD = {
  location: { state: 'Telangana' },
  capabilities: {
    autoPrintMaxPages: 30,
    isAutoPrintEnabled: true,
    supportsColor: true,
    supportsBlackAndWhite: true,
    supportedPaperSizes: ['A4'] as PaperSize[],
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
      <ShopDetailsFormFields
        name={name}
        slug={slug}
        city={city}
        phone={phone}
        tagline={tagline}
        isSlugTouched={isSlugTouched}
        slugSanity={slugSanity}
        onNameChange={handleNameChange}
        onSlugChange={handleSlugChange}
        onAutoGenerateSlug={() => {
          setSlug(generateAutoSlug(name));
          setIsSlugTouched(false);
        }}
        onCityChange={setCity}
        onPhoneChange={handlePhoneChange}
        onTaglineChange={setTagline}
      />

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
