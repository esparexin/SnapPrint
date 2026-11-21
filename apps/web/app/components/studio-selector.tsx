'use client';

import React from 'react';
import { UserMembership, UserRole } from '@snapprint/contracts';

interface StudioSelectorProps {
  activeMemberships: UserMembership[];
  selectedStudioId: string | null;
  onSelectStudio: (studioId: string) => void;
  effectiveRole: UserRole | null;
}

export function StudioSelector({
  activeMemberships,
  selectedStudioId,
  onSelectStudio,
  effectiveRole,
}: StudioSelectorProps) {
  return (
    <section
      style={{
        background: '#f9fafb',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <label
            htmlFor="studio-select"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.25rem',
            }}
          >
            Active Studio Context
          </label>
          <select
            id="studio-select"
            value={selectedStudioId || ''}
            onChange={(e) => onSelectStudio(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              minWidth: '200px',
            }}
          >
            {activeMemberships.map((m) => (
              <option key={m.studioId || 'platform'} value={m.studioId || 'platform_scope'}>
                {m.studioId ? `Studio: ${m.studioId}` : 'Platform Administration'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span style={{ fontSize: '0.875rem', color: '#4b5563', marginRight: '0.5rem' }}>
            Effective Role:
          </span>
          <span
            style={{
              padding: '0.25rem 0.5rem',
              background: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {effectiveRole}
          </span>
        </div>
      </div>
    </section>
  );
}
