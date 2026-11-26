'use client';

import React, { useState } from 'react';
import { AgentDevice } from '../../src/printer-client';
import { unbindAgentDevice } from '../../src/printer-capability-client';
import { useDialog } from '../hooks/use-dialog';

interface UnbindDeviceModalProps {
  studioId: string;
  device: AgentDevice;
  onClose: () => void;
  onUnbound: () => void;
}

export function UnbindDeviceModal({
  studioId,
  device,
  onClose,
  onUnbound,
}: UnbindDeviceModalProps) {
  const [reason, setReason] = useState('New computer replacement');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useDialog({ isOpen: true, onClose, enableSwipeDown: true });

  const handleUnbind = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await unbindAgentDevice(studioId, device.deviceId, reason);
      onUnbound();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unbind workstation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unbind-modal-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div className="dialog-content max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="unbind-modal-title" className="text-lg font-bold text-red-700 mb-2">
          Unbind Workstation Computer
        </h2>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Are you sure you want to disconnect <strong>{device.hostname}</strong> (
          {device.osPlatform})? Any physical printers attached solely to this PC will go offline.
          You can pair a new computer anytime.
        </p>

        {error && (
          <div role="alert" className="p-2.5 bg-red-50 text-red-700 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleUnbind} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Reason for Unbinding (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Purchased new laptop"
              className="w-full min-h-[44px] px-3 rounded-md border border-slate-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
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
              className="min-h-[44px] px-5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            >
              {submitting ? 'Unbinding...' : 'Confirm Unbind'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
