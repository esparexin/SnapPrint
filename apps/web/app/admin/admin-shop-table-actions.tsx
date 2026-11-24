'use client';

import React from 'react';
import { PlatformStudioItem } from '@snapprint/contracts';
import { adminTableStyles } from './admin-table-styles';

export function AdminShopTableActionsCell({
  studio,
  onInspect,
  onManageSubscription,
  onManageStatus,
}: {
  studio: PlatformStudioItem;
  onInspect: (studio: PlatformStudioItem) => void;
  onManageSubscription?: (studio: PlatformStudioItem) => void;
  onManageStatus: (studio: PlatformStudioItem) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: '0.35rem',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInspect(studio);
        }}
        style={{
          ...adminTableStyles.input,
          cursor: 'pointer',
          backgroundColor: '#f8fafc',
          fontWeight: 500,
          padding: '0.35rem 0.55rem',
        }}
      >
        Details
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onManageSubscription) {
            onManageSubscription(studio);
          } else {
            onInspect(studio);
          }
        }}
        style={{
          ...adminTableStyles.input,
          cursor: 'pointer',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          borderColor: '#bfdbfe',
          fontWeight: 600,
          padding: '0.35rem 0.55rem',
        }}
        title="Extend or override subscription"
      >
        ⚡ Plan
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onManageStatus(studio);
        }}
        style={{
          ...adminTableStyles.input,
          cursor: 'pointer',
          backgroundColor: '#ffffff',
          fontWeight: 500,
          padding: '0.35rem 0.55rem',
        }}
      >
        Status
      </button>
    </div>
  );
}
