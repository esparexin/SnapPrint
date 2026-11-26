'use client';

import React from 'react';
import { CustomPaperSize, PrinterRole } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';
import { DUPLEX_BADGES, ROLE_COLORS, UNVERIFIED_DUPLEX } from './operator-portal-styles';

interface PrinterRowItemProps {
  printer: StudioPrinter;
  customSizes?: CustomPaperSize[];
  isUpdating: boolean;
  onRoleChange: (printerId: string, role: PrinterRole) => void;
  onConfirmDuplex?: (printer: StudioPrinter) => void;
}

const pill = (bg: string, fg: string, isBtn = false): React.CSSProperties => ({
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: 600,
  backgroundColor: bg,
  color: fg,
  border: isBtn ? '1px solid #fcd34d' : 'none',
  cursor: isBtn ? 'pointer' : 'default',
});

const cardStyle: React.CSSProperties = {
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

export function PrinterRowItem({
  printer,
  customSizes,
  isUpdating,
  onRoleChange,
  onConfirmDuplex,
}: PrinterRowItemProps) {
  const isOnline = printer.status === 'online';
  const duplexBadge =
    (printer.duplexSupport && DUPLEX_BADGES[printer.duplexSupport]) || UNVERIFIED_DUPLEX;
  const roleTheme = ROLE_COLORS[printer.role] || { bg: '#f8fafc', color: '#475569' };
  const needsDuplexVerify =
    Boolean(onConfirmDuplex) &&
    (printer.duplexSupport === 'unknown' || printer.capabilityProvenance === 'unverified');

  return (
    <div style={cardStyle}>
      <div style={{ flex: '1 1 240px', minWidth: '240px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#94a3b8',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{printer.name}</strong>
          {printer.isDefaultOsPrinter && <span style={pill('#e0e7ff', '#3730a3')}>OS Default</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 8px' }}>
          Driver: {printer.driverName} {printer.deviceId && `· Host: ${printer.deviceId}`}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span
            style={pill(
              printer.isColorSupported ? '#fef3c7' : '#f1f5f9',
              printer.isColorSupported ? '#92400e' : '#475569'
            )}
          >
            {printer.isColorSupported ? '🌈 Color' : '⬛ Monochromatic (B&W)'}
          </span>
          <span style={pill(duplexBadge.bg, duplexBadge.fg)}>{duplexBadge.label}</span>
          {needsDuplexVerify && (
            <button
              type="button"
              onClick={() => onConfirmDuplex?.(printer)}
              style={pill('#fef3c7', '#92400e', true)}
            >
              Confirm Duplex
            </button>
          )}
          {printer.supportedPaperSizes.map((size) => {
            const match = size.startsWith('cps_')
              ? customSizes?.find((c) => c.id === size)
              : undefined;
            const name = match ? match.name : size;
            return (
              <span
                key={size}
                title={match ? `${name} (${size})` : size}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: match ? 600 : 400,
                  backgroundColor: match ? '#e0f2fe' : '#f1f5f9',
                  color: match ? '#0369a1' : '#475569',
                }}
              >
                {name}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Role:</label>
        <select
          aria-label={`Role for ${printer.name}`}
          value={printer.role}
          disabled={isUpdating}
          onChange={(e) => onRoleChange(printer.id, e.target.value as PrinterRole)}
          style={{
            minHeight: '44px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: roleTheme.bg,
            color: roleTheme.color,
          }}
        >
          <option value="active_bw">Active B&amp;W (Primary)</option>
          <option value="active_color" disabled={!printer.isColorSupported}>
            {printer.isColorSupported
              ? 'Active Color (Primary)'
              : 'Active Color (Unavailable on B&W)'}
          </option>
          <option value="standby">Standby (Backup)</option>
        </select>
      </div>
    </div>
  );
}
