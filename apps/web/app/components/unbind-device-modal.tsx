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

  const { handleBackdropClick } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

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
        aria-labelledby="unbind-modal-title"
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
        <h2 id="unbind-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px', color: '#b91c1c' }}>
          Unbind Workstation Computer
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
          Are you sure you want to disconnect <strong>{device.hostname}</strong> ({device.osPlatform})? Any physical printers attached solely to this PC will go offline. You can pair a new computer anytime.
        </p>

        {error && (
          <div role="alert" style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleUnbind}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Reason for Unbinding (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Purchased new laptop"
              style={{ width: '100%', minHeight: '44px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}
            />
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
              style={{ minHeight: '44px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {submitting ? 'Unbinding...' : 'Confirm Unbind'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
