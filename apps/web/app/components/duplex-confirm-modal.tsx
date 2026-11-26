'use client';

import React, { useState } from 'react';
import { StudioPrinter } from '../../src/printer-client';
import { confirmPrinterCapability } from '../../src/printer-capability-client';
import { useDialog } from '../hooks/use-dialog';

interface DuplexConfirmModalProps {
  studioId: string;
  printer: StudioPrinter;
  onClose: () => void;
  onConfirmed: () => void;
}

export function DuplexConfirmModal({
  studioId,
  printer,
  onClose,
  onConfirmed,
}: DuplexConfirmModalProps) {
  const [duplexSupport, setDuplexSupport] = useState<'supported' | 'unsupported'>('unsupported');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await confirmPrinterCapability(studioId, printer.id, { duplexSupport });
      onConfirmed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm capability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplex-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2 id="duplex-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px' }}>
          Confirm Duplex Capability
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 16px' }}>
          Does <strong>{printer.name}</strong> support automatic double-sided printing?
        </p>

        {error && (
          <div role="alert" style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="duplex"
                value="unsupported"
                checked={duplexSupport === 'unsupported'}
                onChange={() => setDuplexSupport('unsupported')}
                style={{ width: '18px', height: '18px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem' }}>⇥ Simplex Only</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Prints on one side only. Customers cannot choose double-sided.</span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="duplex"
                value="supported"
                checked={duplexSupport === 'supported'}
                onChange={() => setDuplexSupport('supported')}
                style={{ width: '18px', height: '18px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9375rem' }}>🔄 Automatic Duplex</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hardware feeds and flips paper automatically.</span>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ minHeight: '44px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ minHeight: '44px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {submitting ? 'Saving...' : 'Save Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
