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
  enabledSizes?: string[];
  loading: boolean;
  updatingId: string | null;
  initialTab?: 'printers' | 'workstations' | 'sizes';
  onRoleChange: (printerId: string, role: PrinterRole) => void;
  onPairAgent: () => void;
  onConfirmDuplex: (printer: StudioPrinter) => void;
  onUnbindDevice: (device: AgentDevice) => void;
  onRefreshSizes: () => void;
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  minHeight: '36px',
  padding: '0 14px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: active ? '#0284c7' : '#f1f5f9',
  color: active ? '#ffffff' : '#475569',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
});

export function PrinterFleetTabContent({
  studioId,
  printers,
  devices,
  standardSizes,
  customSizes,
  enabledSizes,
  loading,
  updatingId,
  initialTab = 'printers',
  onRoleChange,
  onPairAgent,
  onConfirmDuplex,
  onUnbindDevice,
  onRefreshSizes,
}: PrinterFleetTabContentProps) {
  const [tab, setTab] = useState<'printers' | 'workstations' | 'sizes'>(initialTab);

  React.useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

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
        <button type="button" onClick={() => setTab('printers')} style={tabBtn(tab === 'printers')}>
          Printers ({printers.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('workstations')}
          style={tabBtn(tab === 'workstations')}
        >
          Computers ({devices.length})
        </button>
        <button type="button" onClick={() => setTab('sizes')} style={tabBtn(tab === 'sizes')}>
          Paper Sizes ({standardSizes.length + customSizes.length})
        </button>
      </div>

      {tab === 'printers' && (
        <PrinterFleetList
          printers={printers}
          customSizes={customSizes}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={onRoleChange}
          onPairAgent={onPairAgent}
          onConfirmDuplex={onConfirmDuplex}
          isBound={devices.some((d) => d.status === 'active')}
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
          enabledSizes={enabledSizes}
          onRefreshSizes={onRefreshSizes}
        />
      )}
    </div>
  );
}
