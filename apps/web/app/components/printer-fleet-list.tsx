'use client';

import React from 'react';
import { PrinterRole } from '@snapprint/contracts';
import { StudioPrinter } from '../../src/printer-client';
import { EmptyPrinterState } from './empty-printer-state';
import { PrinterRowItem } from './printer-row-item';

interface PrinterFleetListProps {
  printers: StudioPrinter[];
  loading: boolean;
  updatingId: string | null;
  onRoleChange: (printerId: string, role: PrinterRole) => void;
  onPairAgent: () => void;
}

export function PrinterFleetList({
  printers,
  loading,
  updatingId,
  onRoleChange,
  onPairAgent,
}: PrinterFleetListProps) {
  return (
    <>
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          color: '#166534',
          marginBottom: '16px',
          lineHeight: 1.5,
        }}
      >
        <strong>💡 Smart Capability Routing:</strong> B&amp;W jobs route automatically to the{' '}
        <strong>Active B&amp;W</strong> printer. Color jobs route automatically to the{' '}
        <strong>Active Color</strong> printer. Standby printers act as backups.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
          Loading connected printers...
        </div>
      ) : printers.length === 0 ? (
        <EmptyPrinterState onPairAgent={onPairAgent} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {printers.map((printer) => (
            <PrinterRowItem
              key={printer.id}
              printer={printer}
              isUpdating={updatingId === printer.id}
              onRoleChange={onRoleChange}
            />
          ))}
        </div>
      )}
    </>
  );
}
