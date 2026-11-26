'use client';

import React, { useState } from 'react';
import { AgentDevice } from '../../src/printer-client';
import { unbindAgentDevice } from '../../src/printer-capability-client';
import { ModalSheetShell } from './modal-sheet-shell';

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
    <ModalSheetShell
      isOpen
      isNested
      onClose={onClose}
      titleId="unbind-modal-title"
      title={<span style={{ color: '#b91c1c' }}>Unbind Workstation Computer</span>}
      maxWidth="480px"
      contentStyle={{ padding: '20px' }}
    >
      <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
        Are you sure you want to disconnect <strong>{device.hostname}</strong> ({device.osPlatform}
        )? Any physical printers attached solely to this PC will go offline. You can pair a new
        computer anytime.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
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
        onSubmit={handleUnbind}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Reason for Unbinding (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Purchased new laptop"
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

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
              backgroundColor: '#ffffff',
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
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Unbinding...' : 'Confirm Unbind'}
          </button>
        </div>
      </form>
    </ModalSheetShell>
  );
}
