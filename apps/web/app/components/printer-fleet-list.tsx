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
  onConfirmDuplex?: (printer: StudioPrinter) => void;
  isBound?: boolean;
}

export function PrinterFleetList({
  printers,
  loading,
  updatingId,
  onRoleChange,
  onPairAgent,
  onConfirmDuplex,
  isBound = false,
}: PrinterFleetListProps) {
  return (
    <>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
          Loading connected printers...
        </div>
      ) : printers.length === 0 ? (
        <EmptyPrinterState onPairAgent={onPairAgent} isBound={isBound} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {printers.map((printer) => (
            <PrinterRowItem
              key={printer.id}
              printer={printer}
              isUpdating={updatingId === printer.id}
              onRoleChange={onRoleChange}
              onConfirmDuplex={onConfirmDuplex}
            />
          ))}
        </div>
      )}
    </>
  );
}
