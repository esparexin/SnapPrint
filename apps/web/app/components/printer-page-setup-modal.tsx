'use client';

import React, { useEffect, useState } from 'react';
import { PrinterRole, Studio } from '@snapprint/contracts';
import {
  fetchStudioPrinters,
  StudioFleetAllowance,
  StudioPrinter,
  updatePrinterRole,
} from '../../src/printer-client';
import { fetchStudio } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { AgentPairingModal } from './agent-pairing-modal';
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
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [allowance, setAllowance] = useState<StudioFleetAllowance | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fleet, studioData] = await Promise.all([
        fetchStudioPrinters(studioId),
        fetchStudio(studioId),
      ]);
      setPrinters(fleet.printers);
      if (fleet.allowance) setAllowance(fleet.allowance);
      if (studioData?.studio) setStudio(studioData.studio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studioId]);

  const handleRoleChange = async (printerId: string, role: PrinterRole) => {
    setUpdatingId(printerId);
    setError(null);
    try {
      await updatePrinterRole(studioId, printerId, role);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update printer role.');
    } finally {
      setUpdatingId(null);
    }
  };

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
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '16px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}
        <PrinterFleetList
          printers={printers}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={handleRoleChange}
          onPairAgent={() => setShowPairingModal(true)}
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
        style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        {content}
      </div>
    </div>
  );
}
