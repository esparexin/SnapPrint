'use client';

import React from 'react';
import { StaffMember } from '@snapprint/contracts';

export interface StaffRosterListProps {
  staff: StaffMember[];
  loading: boolean;
  revokingId: string | null;
  onRevoke: (memberId: string) => void;
}

export function StaffRosterList({ staff, loading, revokingId, onRevoke }: StaffRosterListProps) {
  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '24px 0',
          color: '#64748b',
          fontSize: '0.875rem',
        }}
      >
        Loading staff members...
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '16px 0',
          color: '#64748b',
          fontSize: '0.8125rem',
        }}
      >
        No staff members invited yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {staff.map((member) => (
        <div
          key={member.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
              {member.name || member.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {member.email} •{' '}
              <span
                style={{
                  textTransform: 'capitalize',
                  color: member.status === 'active' ? '#16a34a' : '#b45309',
                }}
              >
                {member.status}
              </span>
            </div>
          </div>
          {member.role === 'studio_staff' && (
            <button
              type="button"
              onClick={() => onRevoke(member.id)}
              disabled={revokingId === member.id}
              style={{
                padding: '4px 8px',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: revokingId === member.id ? 'not-allowed' : 'pointer',
              }}
            >
              {revokingId === member.id ? 'Revoking…' : 'Revoke'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
