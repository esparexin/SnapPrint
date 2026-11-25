'use client';

import React from 'react';
import { PrinterRole } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';

interface PrinterRowItemProps {
  printer: StudioPrinter;
  isUpdating: boolean;
  onRoleChange: (printerId: string, role: PrinterRole) => void;
}

export function PrinterRowItem({ printer, isUpdating, onRoleChange }: PrinterRowItemProps) {
  const isOnline = printer.status === 'online';

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#94a3b8',
              display: 'inline-block',
            }}
          />
          <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{printer.name}</strong>
          {printer.isDefaultOsPrinter && (
            <span
              style={{
                fontSize: '0.6875rem',
                padding: '2px 6px',
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              OS Default
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 8px' }}>
          Driver: {printer.driverName}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '2px 8px',
              backgroundColor: printer.isColorSupported ? '#fef3c7' : '#f1f5f9',
              color: printer.isColorSupported ? '#92400e' : '#475569',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {printer.isColorSupported ? '🌈 Color' : '⬛ Monochromatic (B&W)'}
          </span>
          {printer.supportedPaperSizes.map((size) => (
            <span
              key={size}
              style={{
                fontSize: '0.6875rem',
                padding: '2px 6px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                borderRadius: '4px',
              }}
            >
              {size}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Role:</label>
        <select
          aria-label={`Role for ${printer.name}`}
          value={printer.role}
          disabled={isUpdating}
          onChange={(e) => onRoleChange(printer.id, e.target.value as PrinterRole)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8125rem',
            fontWeight: 600,
            backgroundColor:
              printer.role === 'active_bw'
                ? '#f0fdf4'
                : printer.role === 'active_color'
                  ? '#eff6ff'
                  : '#f8fafc',
            color:
              printer.role === 'active_bw'
                ? '#166534'
                : printer.role === 'active_color'
                  ? '#1d4ed8'
                  : '#475569',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="active_bw">Active B&amp;W (Primary)</option>
          {printer.isColorSupported ? (
            <option value="active_color">Active Color (Primary)</option>
          ) : (
            <option value="active_color" disabled>
              Active Color (Unavailable on B&amp;W)
            </option>
          )}
          <option value="standby">Standby (Backup)</option>
        </select>
      </div>
    </div>
  );
}
