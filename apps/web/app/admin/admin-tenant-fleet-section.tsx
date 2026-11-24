'use client';

import React from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';
import { AdminTenantDeviceList } from './admin-tenant-device-list';

interface AdminTenantFleetSectionProps {
  printers: PlatformStudioDetailsResponse['printers'];
  devices: PlatformStudioDetailsResponse['devices'];
  studioId?: string;
}

export function AdminTenantFleetSection({
  printers,
  devices,
  studioId,
}: AdminTenantFleetSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h4
          style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem' }}
        >
          Configured Fleet Printers ({printers.length})
        </h4>
        {printers.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
            No physical printers discovered or enrolled.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {printers.map((p) => (
              <div
                key={p.id}
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
                  <strong style={{ color: '#0f172a' }}>{p.name}</strong>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem',
                      backgroundColor: p.status === 'idle' ? '#ecfdf5' : '#fef2f2',
                      color: p.status === 'idle' ? '#065f46' : '#991b1b',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Driver: {p.driverName} | Color: {p.isColorSupported ? 'Yes' : 'Monochrome'} |
                  Sizes: {p.supportedPaperSizes.join(', ') || 'Standard'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminTenantDeviceList devices={devices} studioId={studioId} />
    </div>
  );
}
