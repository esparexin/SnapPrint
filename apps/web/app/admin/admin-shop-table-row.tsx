'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles, statusBadges } from './admin-table-styles';

export interface AdminShopTableRowProps {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageStatus: (studio: PlatformStudioItem) => void;
}

export function AdminShopTableRow({ studio, onInspect, onManageStatus }: AdminShopTableRowProps) {
  const b = statusBadges[studio.status] || statusBadges.closed;

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={adminTableStyles.tdBold}>{studio.name}</td>
      <td style={adminTableStyles.tdMono}>
        <div>{studio.id}</div>
        <div style={{ color: '#94a3b8' }}>/{studio.slug}</div>
      </td>
      <td style={adminTableStyles.td}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.6rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '9999px',
            backgroundColor: b.bg,
            color: b.color,
            border: `1px solid ${b.border}`,
          }}
        >
          {studio.status}
        </span>
      </td>
      <td style={adminTableStyles.tdContact}>
        {studio.ownerEmail ? (
          <div>
            <strong style={{ color: '#0f172a' }}>{studio.ownerEmail}</strong>
            {studio.ownerName && (
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{studio.ownerName}</div>
            )}
          </div>
        ) : studio.contactEmail ? (
          <div>{studio.contactEmail}</div>
        ) : (
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No email registered</span>
        )}
        {studio.contactPhone && <div style={{ color: '#94a3b8' }}>{studio.contactPhone}</div>}
      </td>
      <td style={adminTableStyles.tdMuted}>{new Date(studio.createdAt).toLocaleDateString()}</td>
      <td style={adminTableStyles.tdRight}>
        <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onInspect(studio)}
            style={{
              ...adminTableStyles.input,
              cursor: 'pointer',
              backgroundColor: '#f8fafc',
              fontWeight: 500,
            }}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => onManageStatus(studio)}
            style={{
              ...adminTableStyles.input,
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              fontWeight: 500,
            }}
          >
            Status
          </button>
        </div>
      </td>
    </tr>
  );
}
