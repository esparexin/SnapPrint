'use client';

import React, { useEffect, useState } from 'react';
import { PrinterRole } from '@snapprint/contracts';
import { fetchStudioPrinters, StudioPrinter, updatePrinterRole } from '../../src/printer-client';
import { useDialog } from '../hooks/use-dialog';
import { AgentPairingModal } from './agent-pairing-modal';
import { PrinterFleetFooter } from './printer-fleet-footer';
import { PrinterFleetHeader } from './printer-fleet-header';
import { PrinterFleetList } from './printer-fleet-list';

interface PrinterManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
  inShell?: boolean;
}

export function PrinterManagementModal({
  studioId,
  studioName,
  onClose,
  inShell = false,
}: PrinterManagementModalProps) {
  const [printers, setPrinters] = useState<StudioPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);

  const loadPrinters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudioPrinters(studioId);
      setPrinters(data.printers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch studio printers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, [studioId]);

  const handleRoleChange = async (printerId: string, role: PrinterRole) => {
    setUpdatingId(printerId);
    setError(null);
    try {
      await updatePrinterRole(studioId, printerId, role);
      setPrinters((prev) =>
        prev.map((p) => {
          if (p.id === printerId) return { ...p, role };
          if (role !== 'standby' && p.role === role) return { ...p, role: 'standby' };
          return p;
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update printer role');
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
        onOpenPairing={() => setShowPairingModal(true)}
        onClose={inShell ? undefined : onClose}
      />
      <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '16px',
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
      </div>
      <PrinterFleetFooter loading={loading} onRefresh={loadPrinters} onClose={onClose} />
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
    return <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>{content}</div>;
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
