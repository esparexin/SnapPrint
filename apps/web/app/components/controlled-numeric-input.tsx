'use client';

import React, { useEffect, useState } from 'react';

export interface ControlledNumericInputProps {
  id?: string;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
  allowDecimals?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function ControlledNumericInput({
  id,
  value,
  onChange,
  allowDecimals = false,
  min,
  max,
  placeholder,
  required,
  disabled,
  style,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: ControlledNumericInputProps) {
  const [text, setText] = useState<string>(() => {
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  });

  useEffect(() => {
    const stringVal = value === undefined || value === null || value === '' ? '' : String(value);
    setText((prev) => {
      if (prev !== '' && stringVal !== '' && parseFloat(prev) === parseFloat(stringVal)) {
        return prev;
      }
      return stringVal;
    });
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setText('');
      onChange('');
      return;
    }

    const regex = allowDecimals ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;
    if (!regex.test(raw)) return;

    setText(raw);
    const parsed = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (text.trim() === '') {
      if (required && min !== undefined) {
        setText(String(min));
        onChange(min);
      }
      return;
    }
    let parsed = allowDecimals ? parseFloat(text) : parseInt(text, 10);
    if (isNaN(parsed)) return;
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    setText(String(parsed));
    onChange(parsed);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onWheel={(e) => e.currentTarget.blur()}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      style={style}
      className={className}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
    />
  );
}
