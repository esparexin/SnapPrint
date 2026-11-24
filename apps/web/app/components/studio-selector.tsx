'use client';

import React from 'react';
import { UserMembership, UserRole } from '@snapprint/contracts';

interface StudioSelectorProps {
  activeMemberships: UserMembership[];
  selectedStudioId: string | null;
  onSelectStudio: (studioId: string) => void;
  effectiveRole?: UserRole | null;
  studioNames?: Record<string, string>;
}

export function formatStudioOptionLabel(
  membership: { studioId?: string | null },
  studioNames: Record<string, string> = {}
): string {
  if (!membership.studioId || membership.studioId === 'platform_scope') {
    return 'Platform Administration';
  }
  const friendlyName = studioNames[membership.studioId];
  return friendlyName
    ? `${friendlyName} (${membership.studioId})`
    : `Studio: ${membership.studioId}`;
}

export function StudioSelector({
  activeMemberships,
  selectedStudioId,
  onSelectStudio,
  studioNames = {},
}: StudioSelectorProps) {
  const selectable = activeMemberships.filter((m) => m.studioId && m.studioId !== 'platform_scope');
  if (selectable.length <= 1) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem',
        padding: '0.5rem 0.75rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
      }}
    >
      <label
        htmlFor="studio-select"
        style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}
      >
        Switch Shop:
      </label>
      <select
        id="studio-select"
        value={selectedStudioId || ''}
        onChange={(e) => onSelectStudio(e.target.value)}
        style={{
          padding: '0.375rem 0.625rem',
          borderRadius: '0.375rem',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          fontSize: '0.8125rem',
          color: '#1e293b',
        }}
      >
        {activeMemberships.map((m) => (
          <option key={m.studioId || 'platform'} value={m.studioId || 'platform_scope'}>
            {formatStudioOptionLabel(m, studioNames)}
          </option>
        ))}
      </select>
    </div>
  );
}
