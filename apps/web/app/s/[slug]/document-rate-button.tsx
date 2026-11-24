'use client';

import React from 'react';

const baseBoxStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '8px',
  textAlign: 'left',
  minHeight: '44px',
  width: '100%',
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
      opacity: 0.55,
      cursor: 'not-allowed',
    };
  }
  if (isSelected) {
    return {
      ...baseBoxStyle,
      border: isColorGroup ? '2px solid #c026d3' : '2px solid #0284c7',
      backgroundColor: isColorGroup ? '#fdf4ff' : '#f0f9ff',
      cursor: 'pointer',
      boxShadow: isColorGroup
        ? '0 1px 3px rgba(192, 38, 211, 0.2)'
        : '0 1px 3px rgba(2, 132, 199, 0.2)',
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
      style={getBoxStyle(isSelected, isDisabled, isColor)}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: isSelected ? 700 : 500,
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
