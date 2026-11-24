'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import {
  AdminShopTableActionsCell,
  AdminShopTablePrintersCell,
  AdminShopTableSubscriptionCell,
} from './admin-shop-table-cells';
import { adminTableStyles, statusBadges } from './admin-table-styles';

export interface AdminShopTableRowProps {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageStatus: (studio: PlatformStudioItem) => void;
  onManageSubscription?: (studio: PlatformStudioItem) => void;
}

export function AdminShopTableRow({
  studio,
  onInspect,
  onManageStatus,
  onManageSubscription,
}: AdminShopTableRowProps) {
  const b = statusBadges[studio.status] || statusBadges.closed;

  return (
    <tr
      onClick={() => onInspect(studio)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect(studio);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${studio.name}`}
      title="Click row to view tenant details & manage subscriptions"
      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
    >
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
      <td style={adminTableStyles.td}>
        <AdminShopTableSubscriptionCell subscription={studio.subscription} />
      </td>
      <td style={adminTableStyles.td}>
        <AdminShopTablePrintersCell printerCount={studio.printerCount} payment={studio.payment} />
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
        <AdminShopTableActionsCell
          studio={studio}
          onInspect={onInspect}
          onManageSubscription={onManageSubscription}
          onManageStatus={onManageStatus}
        />
      </td>
    </tr>
  );
}
