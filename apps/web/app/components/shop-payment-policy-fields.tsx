'use client';

import React from 'react';

export interface ShopPaymentPolicyFieldsProps {
  paymentPolicy: 'payment_required' | 'pay_at_counter';
  setPaymentPolicy: (val: 'payment_required' | 'pay_at_counter') => void;
  onlinePaymentEnabled: boolean;
  setOnlinePaymentEnabled: (val: boolean) => void;
  counterPaymentEnabled: boolean;
  setCounterPaymentEnabled: (val: boolean) => void;
}

export function ShopPaymentPolicyFields({
  paymentPolicy,
  setPaymentPolicy,
  onlinePaymentEnabled,
  setOnlinePaymentEnabled,
  counterPaymentEnabled,
  setCounterPaymentEnabled,
}: ShopPaymentPolicyFieldsProps) {
  return (
    <>
      <div>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: '#334155',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          Payment Verification Policy
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px',
              borderRadius: '6px',
              border: `1px solid ${paymentPolicy === 'payment_required' ? '#2563eb' : '#cbd5e1'}`,
              backgroundColor: paymentPolicy === 'payment_required' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="policy"
              checked={paymentPolicy === 'payment_required'}
              onChange={() => setPaymentPolicy('payment_required')}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                Strict Pay-Before-Print (Recommended)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Orders are confirmed and routed to printers only after payment verification.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px',
              borderRadius: '6px',
              border: `1px solid ${paymentPolicy === 'pay_at_counter' ? '#2563eb' : '#cbd5e1'}`,
              backgroundColor: paymentPolicy === 'pay_at_counter' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="policy"
              checked={paymentPolicy === 'pay_at_counter'}
              onChange={() => setPaymentPolicy('pay_at_counter')}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                Pay at Counter / Cash Permitted
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Customer can order and pay cash/UPI at counter before operator releases print.
              </div>
            </div>
          </label>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 16px',
          padding: '10px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={onlinePaymentEnabled}
            onChange={(e) => setOnlinePaymentEnabled(e.target.checked)}
          />
          <span style={{ fontWeight: 500, color: '#334155' }}>Accept Online (UPI / QR)</span>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={counterPaymentEnabled}
            onChange={(e) => setCounterPaymentEnabled(e.target.checked)}
          />
          <span style={{ fontWeight: 500, color: '#334155' }}>Accept Counter Cash</span>
        </label>
      </div>
    </>
  );
}
