'use client';

import React, { useId } from 'react';

interface OrderCustomerFormProps {
  customerName: string;
  customerPhone: string;
  onChangeName: (val: string) => void;
  onChangePhone: (val: string) => void;
}

export function OrderCustomerForm({
  customerName,
  customerPhone,
  onChangeName,
  onChangePhone,
}: OrderCustomerFormProps) {
  const nameId = useId();
  const phoneId = useId();

  return (
    <div className="sf-customer-grid">
      <div style={{ minWidth: 0 }}>
        <label htmlFor={nameId} className="sf-field-label">
          Customer Name (Optional)
        </label>
        <input
          id={nameId}
          type="text"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="For counter call"
          autoComplete="name"
          enterKeyHint="next"
          className="sf-customer-input"
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <label htmlFor={phoneId} className="sf-field-label">
          Mobile Number (Optional)
        </label>
        <input
          id={phoneId}
          type="tel"
          value={customerPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          placeholder="10-digit mobile"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="done"
          className="sf-customer-input"
        />
      </div>
    </div>
  );
}
