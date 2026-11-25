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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChangePhone(onlyNumbers);
  };

  const isPhoneIncomplete = customerPhone.length > 0 && customerPhone.length < 10;

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
          onChange={handlePhoneChange}
          placeholder="10-digit mobile"
          autoComplete="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          enterKeyHint="done"
          className="sf-customer-input"
          style={isPhoneIncomplete ? { borderColor: '#ef4444' } : undefined}
          aria-invalid={isPhoneIncomplete}
          aria-describedby={isPhoneIncomplete ? `${phoneId}-error` : undefined}
        />
        {isPhoneIncomplete && (
          <div
            id={`${phoneId}-error`}
            role="alert"
            style={{
              color: '#dc2626',
              fontSize: '11px',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            Please enter a 10-digit mobile number ({customerPhone.length}/10)
          </div>
        )}
      </div>
    </div>
  );
}
