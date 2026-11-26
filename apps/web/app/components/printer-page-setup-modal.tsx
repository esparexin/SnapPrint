'use client';

import React, { useState } from 'react';
import { StudioPrinter } from '../../src/printer-client';
import { useDialog } from '../hooks/use-dialog';
import { usePrinterPageSetup } from '../hooks/use-printer-page-setup';
import { portalStyles } from './operator-portal-styles';
import { AgentPairingModal } from './agent-pairing-modal';
import { DuplexConfirmModal } from './duplex-confirm-modal';
import { PrinterFleetFooter } from './printer-fleet-footer';
import { PrinterFleetHeader } from './printer-fleet-header';
import { PrinterFleetList } from './printer-fleet-list';
import { PrinterPageSetupSection } from './printer-page-setup-section';

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
  const { printers, allowance, studio, loading, error, updatingId, loadData, handleRoleChange } =
    usePrinterPageSetup(studioId);

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [printerForDuplex, setPrinterForDuplex] = useState<StudioPrinter | null>(null);

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
        <PrinterFleetList
          printers={printers}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={handleRoleChange}
          onPairAgent={() => setShowPairingModal(true)}
          onConfirmDuplex={setPrinterForDuplex}
        />
        {!loading && printers.length > 0 && studio && (
          <PrinterPageSetupSection studioId={studioId} printers={printers} studio={studio} />
        )}
      </div>
      <PrinterFleetFooter
        loading={loading}
        onRefresh={loadData}
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
          onConfirmed={loadData}
        />
      )}
    </>
  );

  if (inShell) return <div className="portal-section-card flex flex-col">{content}</div>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-management-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div className="dialog-content max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {content}
      </div>
    </div>
  );
}
