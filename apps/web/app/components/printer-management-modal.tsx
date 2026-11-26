'use client';

import React, { useEffect, useState } from 'react';
import { CustomPaperSize, PrinterRole, StandardPaperSizeDefinition } from '@snapprint/contracts';
import {
  AgentDevice,
  fetchStudioDevices,
  fetchStudioPrinters,
  StudioFleetAllowance,
  StudioPrinter,
  updatePrinterRole,
} from '../../src/printer-client';
import { fetchStudioPaperSizes } from '../../src/printer-capability-client';
import { useDialog } from '../hooks/use-dialog';
import { AgentPairingModal } from './agent-pairing-modal';
import { DuplexConfirmModal } from './duplex-confirm-modal';
import { PrinterFleetFooter } from './printer-fleet-footer';
import { PrinterFleetHeader } from './printer-fleet-header';
import { PrinterFleetTabContent } from './printer-fleet-tab-content';
import { UnbindDeviceModal } from './unbind-device-modal';

interface PrinterManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
  inShell?: boolean;
}

export function PrinterManagementModal({ studioId, studioName, onClose, inShell = false }: PrinterManagementModalProps) {
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [standardSizes, setStandardSizes] = useState<StandardPaperSizeDefinition[]>([]);
  const [customSizes, setCustomSizes] = useState<CustomPaperSize[]>([]);
  const [allowance, setAllowance] = useState<StudioFleetAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [printerForDuplex, setPrinterForDuplex] = useState<StudioPrinter | null>(null);
  const [deviceToUnbind, setDeviceToUnbind] = useState<AgentDevice | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, dData, sData] = await Promise.all([
        fetchStudioPrinters(studioId),
        fetchStudioDevices(studioId),
        fetchStudioPaperSizes(studioId).catch(() => ({ standard: [], custom: [] })),
      ]);
      setPrinters(pData.printers);
      if (pData.allowance) setAllowance(pData.allowance);
      setDevices(dData.devices);
      setStandardSizes(sData.standard || []);
      setCustomSizes(sData.custom || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [studioId]);

  const handleRoleChange = async (printerId: string, role: PrinterRole) => {
    setUpdatingId(printerId);
    setError(null);
    try {
      await updatePrinterRole(studioId, printerId, role);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update printer role');
    } finally {
      setUpdatingId(null);
    }
  };

  const { handleBackdropClick, swipeHandlers } = useDialog({ isOpen: !inShell, onClose, enableSwipeDown: true });

  const content = (
    <>
      <PrinterFleetHeader
        studioId={studioId}
        studioName={studioName}
        allowance={allowance}
        onOpenPairing={() => setShowPairingModal(true)}
        onClose={inShell ? undefined : onClose}
      />
      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
        <PrinterFleetTabContent
          studioId={studioId}
          printers={printers}
          devices={devices}
          standardSizes={standardSizes}
          customSizes={customSizes}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={handleRoleChange}
          onPairAgent={() => setShowPairingModal(true)}
          onConfirmDuplex={(p) => setPrinterForDuplex(p)}
          onUnbindDevice={(d) => setDeviceToUnbind(d)}
          onRefreshSizes={loadAll}
        />
      </div>
      <PrinterFleetFooter loading={loading} onRefresh={loadAll} onClose={inShell ? undefined : onClose} />
      {showPairingModal && <AgentPairingModal studioId={studioId} studioName={studioName} onClose={() => setShowPairingModal(false)} />}
      {printerForDuplex && <DuplexConfirmModal studioId={studioId} printer={printerForDuplex} onClose={() => setPrinterForDuplex(null)} onConfirmed={loadAll} />}
      {deviceToUnbind && <UnbindDeviceModal studioId={studioId} device={deviceToUnbind} onClose={() => setDeviceToUnbind(null)} onUnbound={loadAll} />}
    </>
  );

  if (inShell) return <div className="portal-section-card" style={{ display: 'flex', flexDirection: 'column' }}>{content}</div>;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="printer-management-title" className="dialog-overlay" onClick={handleBackdropClick}>
      <div className="dialog-content" style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {content}
      </div>
    </div>
  );
}
