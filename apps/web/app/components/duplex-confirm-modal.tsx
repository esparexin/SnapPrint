'use client';

import React, { useState } from 'react';
import { StudioPrinter } from '../../src/printer-client';
import { confirmPrinterCapability } from '../../src/printer-capability-client';
import { ModalSheetShell } from './modal-sheet-shell';

interface DuplexConfirmModalProps {
  studioId: string;
  printer: StudioPrinter;
  onClose: () => void;
  onConfirmed: () => void;
}

const OPTIONS = [
  {
    v: 'unsupported' as const,
    t: '⇥ Simplex Only',
    d: 'Prints on one side only. Customers cannot choose double-sided.',
  },
  {
    v: 'supported' as const,
    t: '🔄 Automatic Duplex',
    d: 'Hardware feeds and flips paper automatically.',
  },
];

export function DuplexConfirmModal({
  studioId,
  printer,
  onClose,
  onConfirmed,
}: DuplexConfirmModalProps) {
  const [duplexSupport, setDuplexSupport] = useState<'supported' | 'unsupported'>('unsupported');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <ModalSheetShell
      isOpen
      isNested
      onClose={onClose}
      titleId="duplex-modal-title"
      title="Confirm Duplex Capability"
      maxWidth="480px"
      contentStyle={{ padding: '20px' }}
    >
      <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
        Does <strong>{printer.name}</strong> support automatic double-sided printing?
      </p>
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            marginBottom: '14px',
          }}
        >
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {OPTIONS.map((opt) => (
          <label
            key={opt.v}
            className={`duplex-card ${duplexSupport === opt.v ? 'duplex-card-selected' : ''}`}
          >
            <input
              type="radio"
              name="duplex"
              value={opt.v}
              checked={duplexSupport === opt.v}
              onChange={() => setDuplexSupport(opt.v)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.875rem', color: '#0f172a' }}>
                {opt.t}
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{opt.d}</span>
            </div>
          </label>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              minHeight: '44px',
              padding: '0 20px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Save Verification'}
          </button>
        </div>
      </form>
    </ModalSheetShell>
  );
}
