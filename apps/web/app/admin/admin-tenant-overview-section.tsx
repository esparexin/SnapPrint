'use client';

import React from 'react';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';

interface AdminTenantOverviewSectionProps {
  owner: PlatformStudioDetailsResponse['owner'];
  studio: PlatformStudioDetailsResponse['studio'];
}

export function AdminTenantOverviewSection({ owner, studio }: AdminTenantOverviewSectionProps) {
  const loc = studio.location;
  const pay = studio.payment;

  return (
    <>
      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
          Owner Information
        </div>
        {owner ? (
          <div style={{ color: '#0f172a' }}>
            <div>
              <strong>{owner.name}</strong> &lt;{owner.email}&gt;
            </div>
            {owner.phone && <div style={{ color: '#64748b' }}>Phone: {owner.phone}</div>}
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              User ID: {owner.id} &bull; Status: {owner.status}
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            No verified owner record linked.
          </div>
        )}
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
          Business Configuration
        </div>
        <div style={{ color: '#475569' }}>
          <div>
            Address:{' '}
            {loc
              ? `${loc.addressLine || ''}, ${loc.city || ''} ${loc.pincode || ''}`
              : 'Not configured'}
          </div>
          <div>
            Counter Payment: {pay?.enableCounterPayment ? 'Enabled' : 'Disabled'} | Online Payment:{' '}
            {pay?.enableOnlinePayment ? 'Enabled' : 'Disabled'}
          </div>
          <div>
            Auto-Approve Orders: {studio.autoApproveOrders ? 'Enabled' : 'Manual operator approval'}
          </div>
        </div>
      </div>
    </>
  );
}
