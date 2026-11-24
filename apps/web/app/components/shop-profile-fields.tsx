'use client';

import React from 'react';

export interface ShopProfileFieldsProps {
  isAcceptingOrders: boolean;
  setIsAcceptingOrders: (val: boolean) => void;
  tagline: string;
  setTagline: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
}

export function ShopProfileFields({
  isAcceptingOrders,
  setIsAcceptingOrders,
  tagline,
  setTagline,
  contactPhone,
  setContactPhone,
  address,
  setAddress,
}: ShopProfileFieldsProps) {
  return (
    <>
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
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: isAcceptingOrders ? '#166534' : '#9f1239',
              display: 'block',
            }}
          >
            {isAcceptingOrders ? '● Accepting Customer Orders' : '⏸ Orders Paused'}
          </span>
          <span style={{ fontSize: '0.75rem', color: isAcceptingOrders ? '#15803d' : '#be123c' }}>
            {isAcceptingOrders
              ? 'Shop is active for uploads on /s/[slug]'
              : 'Uploads temporarily disabled for customers'}
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
        <label
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '4px',
          }}
        >
          Shop Tagline
        </label>
        <input
          type="text"
          placeholder="e.g. Fast A4 Xerox & High-Speed Prints"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '0.875rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '4px',
          }}
        >
          Customer Support Phone
        </label>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          placeholder="e.g. 9876543210"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '0.875rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '4px',
          }}
        >
          Counter Location Address
        </label>
        <input
          type="text"
          placeholder="e.g. Shop #4, Main Road, Hanamkonda"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '0.875rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </>
  );
}
