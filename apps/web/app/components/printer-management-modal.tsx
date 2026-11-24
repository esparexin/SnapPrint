'use client';

import React, { useEffect, useState } from 'react';
import { PrinterRole } from '@snapprint/contracts';
import { fetchStudioPrinters, StudioPrinter, updatePrinterRole } from '../../src/printer-client';
import { useDialog } from '../hooks/use-dialog';
import { AgentPairingModal } from './agent-pairing-modal';
import { EmptyPrinterState } from './empty-printer-state';
import { PrinterRowItem } from './printer-row-item';

interface PrinterManagementModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
}

export function PrinterManagementModal({
  studioId,
  studioName,
  onClose,
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
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="printer-management-title" className="dialog-overlay" onClick={handleBackdropClick}>
      <div
        className="dialog-content"
        style={{
          maxWidth: '720px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="printer-management-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Hardware &amp; Printers Fleet
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              {studioName || `Studio ${studioId}`} · Capability Routing &amp; Discovery
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowPairingModal(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Pair PC Agent
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="dialog-close-btn"
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
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
            <EmptyPrinterState onPairAgent={() => setShowPairingModal(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {printers.map((printer) => (
                <PrinterRowItem
                  key={printer.id}
                  printer={printer}
                  isUpdating={updatingId === printer.id}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={loadPrinters}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#334155',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ↻ Refresh Printers
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {showPairingModal && (
        <AgentPairingModal
          studioId={studioId}
          studioName={studioName}
          onClose={() => setShowPairingModal(false)}
        />
      )}
    </div>
  );
}
