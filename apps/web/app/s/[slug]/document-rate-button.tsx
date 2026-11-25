'use client';

import React from 'react';

const baseBoxStyle: React.CSSProperties = {
  padding: '6px 9px',
  borderRadius: '7px',
  textAlign: 'left',
  minHeight: '42px',
  width: '100%',
  lineHeight: 1.25,
};

export function getBoxStyle(
  isSelected: boolean,
  isDisabled = false,
  isColorGroup = false
): React.CSSProperties {
  if (isDisabled) {
    return {
      ...baseBoxStyle,
      border: '1px dashed #cbd5e1',
      backgroundColor: '#f8fafc',
      opacity: 0.6,
      cursor: 'not-allowed',
    };
  }
  if (isSelected) {
    return {
      ...baseBoxStyle,
      border: isColorGroup ? '1.5px solid #c026d3' : '1.5px solid #0284c7',
      backgroundColor: isColorGroup ? '#fdf4ff' : '#f0f9ff',
      cursor: 'pointer',
    };
  }
  return {
    ...baseBoxStyle,
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  };
}

export function DocumentRateOptionButton({
  label,
  sublabel,
  isSelected,
  isDisabled = false,
  isColor = false,
  onClick,
}: {
  label: string;
  sublabel: React.ReactNode;
  isSelected: boolean;
  isDisabled?: boolean;
  isColor?: boolean;
  onClick: () => void;
}) {
  const activeColor = isColor ? '#701a75' : '#0369a1';
  const activeSubColor = isColor ? '#86198f' : '#0284c7';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      style={getBoxStyle(isSelected, isDisabled, isColor)}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? activeColor : '#1e293b',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '11px', color: isSelected ? activeSubColor : '#64748b' }}>
        {sublabel}
      </div>
    </button>
  );
}
