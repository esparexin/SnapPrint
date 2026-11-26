'use client';

import React, { useState } from 'react';
import { AgentDevice, StudioPrinter } from '../../src/printer-client';
import { useDialog } from '../hooks/use-dialog';
import { usePrinterFleetData } from '../hooks/use-printer-fleet-data';
import { portalStyles } from './operator-portal-styles';
import { AgentPairingModal } from './agent-pairing-modal';
import { DuplexConfirmModal } from './duplex-confirm-modal';
import { PrinterFleetFooter } from './printer-fleet-footer';
import { PrinterFleetHeader } from './printer-fleet-header';
import { PrinterFleetTabContent } from './printer-fleet-tab-content';
import { PrinterPageSetupSection } from './printer-page-setup-section';
import { UnbindDeviceModal } from './unbind-device-modal';

interface PrinterPageSetupModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
  inShell?: boolean;
}

export function PrinterPageSetupModal({
  studioId,
  studioName,
  onClose,
  inShell = false,
}: PrinterPageSetupModalProps) {
  const {
    printers,
    devices,
    standardSizes,
    customSizes,
    allowance,
    studio,
    loading,
    error,
    updatingId,
    loadAll,
    handleRoleChange,
  } = usePrinterFleetData(studioId);

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [printerForDuplex, setPrinterForDuplex] = useState<StudioPrinter | null>(null);
  const [deviceToUnbind, setDeviceToUnbind] = useState<AgentDevice | null>(null);

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: !inShell,
    onClose,
    enableSwipeDown: true,
  });

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
        {error && (
          <div role="alert" style={portalStyles.alert}>
            {error}
          </div>
        )}
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
          onConfirmDuplex={setPrinterForDuplex}
          onUnbindDevice={setDeviceToUnbind}
          onRefreshSizes={loadAll}
        />
        {!loading && printers.length > 0 && studio && (
          <PrinterPageSetupSection
            studioId={studioId}
            printers={printers}
            studio={studio}
            customSizes={customSizes}
          />
        )}
      </div>
      <PrinterFleetFooter
        loading={loading}
        onRefresh={loadAll}
        onClose={inShell ? undefined : onClose}
      />
      {showPairingModal && (
        <AgentPairingModal
          studioId={studioId}
          studioName={studioName}
          onClose={() => setShowPairingModal(false)}
        />
      )}
      {printerForDuplex && (
        <DuplexConfirmModal
          studioId={studioId}
          printer={printerForDuplex}
          onClose={() => setPrinterForDuplex(null)}
          onConfirmed={loadAll}
        />
      )}
      {deviceToUnbind && (
        <UnbindDeviceModal
          studioId={studioId}
          device={deviceToUnbind}
          onClose={() => setDeviceToUnbind(null)}
          onUnbound={loadAll}
        />
      )}
    </>
  );

  if (inShell) {
    return (
      <div className="portal-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-management-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {content}
      </div>
    </div>
  );
}
