'use client';

import React from 'react';
import { AgentDevice, StudioPrinter } from '../../src/printer-client';
import { AgentPairingModal } from './agent-pairing-modal';
import { DuplexConfirmModal } from './duplex-confirm-modal';
import { UnbindDeviceModal } from './unbind-device-modal';

interface PrinterPageSubModalsProps {
  studioId: string;
  studioName?: string;
  showPairingModal: boolean;
  onClosePairing: () => void;
  printerForDuplex: StudioPrinter | null;
  onCloseDuplex: () => void;
  deviceToUnbind: AgentDevice | null;
  onCloseUnbind: () => void;
  onRefresh: () => void;
}

export function PrinterPageSubModals({
  studioId,
  studioName,
  showPairingModal,
  onClosePairing,
  printerForDuplex,
  onCloseDuplex,
  deviceToUnbind,
  onCloseUnbind,
  onRefresh,
}: PrinterPageSubModalsProps) {
  return (
    <>
      {showPairingModal && (
        <AgentPairingModal studioId={studioId} studioName={studioName} onClose={onClosePairing} />
      )}
      {printerForDuplex && (
        <DuplexConfirmModal
          studioId={studioId}
          printer={printerForDuplex}
          onClose={onCloseDuplex}
          onConfirmed={onRefresh}
        />
      )}
      {deviceToUnbind && (
        <UnbindDeviceModal
          studioId={studioId}
          device={deviceToUnbind}
          onClose={onCloseUnbind}
          onUnbound={onRefresh}
        />
      )}
    </>
  );
}
