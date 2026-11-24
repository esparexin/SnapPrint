'use client';

import React from 'react';

interface OrderCustomerFormProps {
  customerName: string;
  customerPhone: string;
  onChangeName: (val: string) => void;
  onChangePhone: (val: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '16px',
};

export function OrderCustomerForm({
  customerName,
  customerPhone,
  onChangeName,
  onChangePhone,
}: OrderCustomerFormProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0' }}>
      <div style={{ minWidth: 0 }}>
        <label style={labelStyle}>Customer Name (Optional)</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="For counter call"
          style={inputStyle}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <label style={labelStyle}>Mobile Number (Optional)</label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          placeholder="10-digit mobile"
          style={inputStyle}
        />
      </div>
    </div>
  );
}
