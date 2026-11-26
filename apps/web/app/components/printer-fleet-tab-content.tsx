'use client';

import React, { useState } from 'react';
import { CustomPaperSize, PrinterRole, StandardPaperSizeDefinition } from '@snapprint/contracts';
import { AgentDevice, StudioPrinter } from '../../src/printer-client';
import { CustomPaperSizeSection } from './custom-paper-size-section';
import { PrinterFleetList } from './printer-fleet-list';
import { WorkstationFleetSection } from './workstation-fleet-section';

interface PrinterFleetTabContentProps {
  studioId: string;
  printers: StudioPrinter[];
  devices: AgentDevice[];
  standardSizes: StandardPaperSizeDefinition[];
  customSizes: CustomPaperSize[];
  loading: boolean;
  updatingId: string | null;
  onRoleChange: (printerId: string, role: PrinterRole) => void;
  onPairAgent: () => void;
  onConfirmDuplex: (printer: StudioPrinter) => void;
  onUnbindDevice: (device: AgentDevice) => void;
  onRefreshSizes: () => void;
}

export function PrinterFleetTabContent({
  studioId,
  printers,
  devices,
  standardSizes,
  customSizes,
  loading,
  updatingId,
  onRoleChange,
  onPairAgent,
  onConfirmDuplex,
  onUnbindDevice,
  onRefreshSizes,
}: PrinterFleetTabContentProps) {
  const [tab, setTab] = useState<'printers' | 'workstations' | 'sizes'>('printers');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('printers')}
          style={{
            minHeight: '36px',
            padding: '0 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tab === 'printers' ? '#0284c7' : '#f1f5f9',
            color: tab === 'printers' ? '#ffffff' : '#475569',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Printers ({printers.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('workstations')}
          style={{
            minHeight: '36px',
            padding: '0 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tab === 'workstations' ? '#0284c7' : '#f1f5f9',
            color: tab === 'workstations' ? '#ffffff' : '#475569',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Computers ({devices.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('sizes')}
          style={{
            minHeight: '36px',
            padding: '0 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tab === 'sizes' ? '#0284c7' : '#f1f5f9',
            color: tab === 'sizes' ? '#ffffff' : '#475569',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Paper Sizes ({standardSizes.length + customSizes.length})
        </button>
      </div>

      {tab === 'printers' && (
        <PrinterFleetList
          printers={printers}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={onRoleChange}
          onPairAgent={onPairAgent}
          onConfirmDuplex={onConfirmDuplex}
        />
      )}

      {tab === 'workstations' && (
        <WorkstationFleetSection
          devices={devices}
          loading={loading}
          onUnbindDevice={onUnbindDevice}
          onPairAgent={onPairAgent}
        />
      )}

      {tab === 'sizes' && (
        <CustomPaperSizeSection
          studioId={studioId}
          printers={printers}
          standardSizes={standardSizes}
          customSizes={customSizes}
          onRefreshSizes={onRefreshSizes}
        />
      )}
    </div>
  );
}
