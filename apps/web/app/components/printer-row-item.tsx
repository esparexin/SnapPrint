'use client';

import React from 'react';
import { PrinterRole } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';

interface PrinterRowItemProps {
  printer: StudioPrinter;
  isUpdating: boolean;
  onRoleChange: (printerId: string, role: PrinterRole) => void;
  onConfirmDuplex?: (printer: StudioPrinter) => void;
}

function getDuplexBadge(support?: string) {
  if (support === 'supported')
    return { label: '🔄 Duplex supported', bg: '#dcfce7', fg: '#166534' };
  if (support === 'unsupported') return { label: '⇥ Simplex only', bg: '#f1f5f9', fg: '#475569' };
  return { label: '⚠️ Duplex unverified', bg: '#fef3c7', fg: '#92400e' };
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  active_bw: { bg: '#f0fdf4', color: '#166534' },
  active_color: { bg: '#eff6ff', color: '#1d4ed8' },
};

export function PrinterRowItem({
  printer,
  isUpdating,
  onRoleChange,
  onConfirmDuplex,
}: PrinterRowItemProps) {
  const isOnline = printer.status === 'online';
  const duplexBadge = getDuplexBadge(printer.duplexSupport);
  const roleTheme = ROLE_COLORS[printer.role] || { bg: '#f8fafc', color: '#475569' };
  const needsDuplexVerify =
    onConfirmDuplex &&
    (printer.duplexSupport === 'unknown' || printer.capabilityProvenance === 'unverified');

  return (
    <div className="p-3.5 px-4 border border-slate-200 rounded-lg bg-white flex flex-wrap justify-between items-center gap-3">
      <div className="flex-1 min-w-[240px]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
          <strong className="text-sm text-slate-900">{printer.name}</strong>
          {printer.isDefaultOsPrinter && (
            <span className="text-[11px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold">
              OS Default
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 my-1 mb-2">
          Driver: {printer.driverName} {printer.deviceId && `· Host: ${printer.deviceId}`}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span
            className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
              printer.isColorSupported
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {printer.isColorSupported ? '🌈 Color' : '⬛ Monochromatic (B&W)'}
          </span>
          <span
            style={{ backgroundColor: duplexBadge.bg, color: duplexBadge.fg }}
            className="text-[11px] px-2 py-0.5 rounded font-semibold"
          >
            {duplexBadge.label}
          </span>
          {needsDuplexVerify && (
            <button
              type="button"
              onClick={() => onConfirmDuplex(printer)}
              className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
            >
              Confirm Duplex
            </button>
          )}
          {printer.supportedPaperSizes.map((size) => (
            <span
              key={size}
              className={`text-[11px] px-1.5 py-0.5 rounded ${
                size.startsWith('cps_')
                  ? 'bg-sky-100 text-sky-700 font-medium'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {size}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <label className="text-xs text-slate-500 font-medium">Role:</label>
        <select
          aria-label={`Role for ${printer.name}`}
          value={printer.role}
          disabled={isUpdating}
          onChange={(e) => onRoleChange(printer.id, e.target.value as PrinterRole)}
          style={{ backgroundColor: roleTheme.bg, color: roleTheme.color }}
          className="min-h-[44px] px-2.5 rounded-md border border-slate-300 text-xs font-semibold"
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
