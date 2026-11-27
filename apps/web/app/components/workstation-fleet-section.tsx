'use client';

import React from 'react';
import { AgentDevice } from '../../src/printer-client';
import { S } from './workstation-fleet-styles';

interface WorkstationFleetSectionProps {
  devices: AgentDevice[];
  loading: boolean;
  onUnbindDevice: (device: AgentDevice) => void;
  onPairAgent: () => void;
}

export function WorkstationFleetSection({
  devices,
  loading,
  onUnbindDevice,
  onPairAgent,
}: WorkstationFleetSectionProps) {
  const hasActiveDevice = devices.some((d) => d.status === 'active');

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Connected Computers &amp; Workstations
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
            Workstations hosting physical printers. Unbind old PCs when migrating.
          </p>
        </div>
        {!hasActiveDevice && (
          <button type="button" onClick={onPairAgent} style={S.pairBtn}>
            + Pair Workstation
          </button>
        )}
      </div>

      {loading && (
        <div
          style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}
        >
          Loading workstations...
        </div>
      )}
      {!loading && devices.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          No computers enrolled yet. Click &quot;Pair Workstation&quot; to link your first computer.
        </div>
      )}
      {!loading && devices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {devices.map((device) => {
            const isUnbound = device.status === 'unbound';
            return (
              <div key={device.deviceId} style={S.cardStyle(isUnbound)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={S.dot(device.isOnline)} />
                    <strong
                      style={{ fontSize: '0.875rem', color: isUnbound ? '#94a3b8' : '#0f172a' }}
                    >
                      {device.hostname}
                    </strong>
                    <span style={S.pill('#e2e8f0', '#475569')}>{device.osPlatform}</span>
                    {isUnbound && <span style={S.pill('#fee2e2', '#b91c1c')}>Unbound</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Agent v{device.agentVersion} · Last heartbeat:{' '}
                    {new Date(device.lastHeartbeatAt).toLocaleTimeString()}
                  </div>
                </div>
                {!isUnbound && (
                  <button type="button" onClick={() => onUnbindDevice(device)} style={S.unbindBtn}>
                    Unbind Workstation
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
