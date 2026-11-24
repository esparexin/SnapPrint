'use client';

import React, { useState } from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';
import { revokeAgentDevice } from '../../src/printer-client';

interface AdminTenantDeviceListProps {
  devices: PlatformStudioDetailsResponse['devices'];
  studioId?: string;
}

export function AdminTenantDeviceList({ devices, studioId }: AdminTenantDeviceListProps) {
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRevoke = async (deviceId: string) => {
    if (!studioId || revokingId) return;
    setRevokingId(deviceId);
    setActionError(null);
    try {
      await revokeAgentDevice(studioId, deviceId);
      setRevokedIds((prev) => new Set(prev).add(deviceId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke device');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem' }}>
        Paired Agent Hardware ({devices.length})
      </h4>
      {actionError && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            marginBottom: '8px',
          }}
        >
          {actionError}
        </div>
      )}
      {devices.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
          No active print agent devices connected.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {devices.map((d) => {
            const isRevoked = d.status === 'revoked' || revokedIds.has(d.deviceId);
            const isOnline =
              !isRevoked && Date.now() - new Date(d.lastHeartbeatAt).getTime() < 120_000;
            const displayStatus = isRevoked ? 'Revoked' : isOnline ? 'Online' : 'Offline';

            return (
              <div
                key={d.deviceId}
                style={{
                  padding: '0.625rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#0f172a' }}>{d.hostname}</strong>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        backgroundColor: isRevoked ? '#f1f5f9' : isOnline ? '#ecfdf5' : '#fffbeb',
                        color: isRevoked ? '#64748b' : isOnline ? '#065f46' : '#b45309',
                      }}
                    >
                      {displayStatus}
                    </span>
                  </div>
                  {studioId && !isRevoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(d.deviceId)}
                      disabled={revokingId === d.deviceId}
                      style={{
                        padding: '4px 10px',
                        minHeight: '36px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: revokingId === d.deviceId ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {revokingId === d.deviceId ? 'Revoking...' : 'Unbind / Revoke'}
                    </button>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  OS: {d.osPlatform} | Agent: v{d.agentVersion} | Device: {d.deviceId.slice(0, 16)}
                  ...
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
