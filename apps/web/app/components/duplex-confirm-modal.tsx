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

  const { handleBackdropClick } = useDialog({ isOpen: true, onClose, enableSwipeDown: true });

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplex-modal-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div className="dialog-content max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="duplex-modal-title" className="text-lg font-bold text-slate-900 mb-2">
          Confirm Duplex Capability
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Does <strong>{printer.name}</strong> support automatic double-sided printing?
        </p>

        {error && (
          <div role="alert" className="p-2.5 bg-red-50 text-red-700 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="duplex"
                value="unsupported"
                checked={duplexSupport === 'unsupported'}
                onChange={() => setDuplexSupport('unsupported')}
                className="w-4 h-4 text-sky-600"
              />
              <div>
                <strong className="block text-sm text-slate-900">⇥ Simplex Only</strong>
                <span className="text-xs text-slate-500">
                  Prints on one side only. Customers cannot choose double-sided.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="duplex"
                value="supported"
                checked={duplexSupport === 'supported'}
                onChange={() => setDuplexSupport('supported')}
                className="w-4 h-4 text-sky-600"
              />
              <div>
                <strong className="block text-sm text-slate-900">🔄 Automatic Duplex</strong>
                <span className="text-xs text-slate-500">
                  Hardware feeds and flips paper automatically.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[44px] px-4 rounded-md border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
            >
              {submitting ? 'Saving...' : 'Save Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
