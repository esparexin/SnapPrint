'use client';

import React from 'react';

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

interface ShopDetailsFormFieldsProps {
  name: string;
  slug: string;
  city: string;
  phone: string;
  tagline: string;
  isSlugTouched?: boolean;
  slugSanity: { valid: boolean; reason?: string } | null;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlugChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAutoGenerateSlug?: () => void;
  onCityChange: (val: string) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTaglineChange: (val: string) => void;
}

export function ShopDetailsFormFields({
  name,
  slug,
  city,
  phone,
  tagline,
  slugSanity,
  onNameChange,
  onCityChange,
  onPhoneChange,
  onTaglineChange,
}: ShopDetailsFormFieldsProps) {
  return (
    <>
      <div>
        <label htmlFor="shop-name" style={labelStyle}>
          Shop Name *
        </label>
        <input
          id="shop-name"
          type="text"
          value={name}
          onChange={onNameChange}
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
            readOnly
            aria-readonly="true"
            placeholder="ramesh-xerox"
            required
            style={{
              ...inputStyle,
              flex: 1,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              cursor: 'not-allowed',
            }}
          />
        </div>
        <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
          Permanent store identifier (read-only, cannot be changed).
        </p>
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
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="e.g. Hyderabad"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="shop-phone" style={labelStyle}>
          Contact Phone (Optional)
        </label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #d1d5db',
              borderRight: 'none',
              borderTopLeftRadius: '0.375rem',
              borderBottomLeftRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              userSelect: 'none',
            }}
          >
            +91
          </span>
          <input
            id="shop-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={phone}
            onChange={onPhoneChange}
            placeholder="9876512340"
            style={{ ...inputStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1 }}
          />
        </div>
        {phone.length > 0 && phone.length < 10 && (
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
            10-digit mobile number required ({10 - phone.length} more digits)
          </p>
        )}
      </div>

      <div>
        <label htmlFor="shop-tagline" style={labelStyle}>
          Tagline / Notice (Optional)
        </label>
        <input
          id="shop-tagline"
          type="text"
          value={tagline}
          onChange={(e) => onTaglineChange(e.target.value)}
          placeholder="e.g. Fast colour & B/W printing near Bus Stop"
          style={inputStyle}
        />
      </div>
    </>
  );
}
