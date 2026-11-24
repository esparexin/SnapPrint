'use client';

import React from 'react';
import { Permission } from '@snapprint/contracts';
import { ModuleCards } from './module-cards';
import { OfflineHardwareAlertBanner } from './offline-hardware-alert-banner';
import { OperatorView } from './operator-portal-header';
import { portalStyles } from './operator-portal-styles';
import { WorkspaceKpiBar } from './workspace-kpi-bar';

interface OperatorStudioHubProps {
  studioId?: string;
  can: (permission: Permission) => boolean;
  onNavigate: (view: OperatorView) => void;
}

const QUICK_TABS: { id: OperatorView; label: string; icon: string }[] = [
  { id: 'orders', label: 'Orders', icon: '📄' },
  { id: 'printers', label: 'Printers', icon: '🖨️' },
  { id: 'qr', label: 'QR Stand', icon: '📱' },
  { id: 'payment', label: 'Payments', icon: '💰' },
  { id: 'profile', label: 'Settings', icon: '🏪' },
  { id: 'staff', label: 'Staff', icon: '👥' },
];

export function OperatorStudioHub({ studioId, can, onNavigate }: OperatorStudioHubProps) {
  return (
    <>
      {studioId && (
        <>
          <OfflineHardwareAlertBanner
            studioId={studioId}
            onOpenPairing={() => onNavigate('printers')}
          />
          <WorkspaceKpiBar studioId={studioId} onNavigate={onNavigate} />
        </>
      )}

      <div
        role="tablist"
        aria-label="Shop Navigation Tabs"
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        {QUICK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            onClick={() => onNavigate(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <section>
        <h2 style={portalStyles.sectionHeading}>Shop Controls</h2>
        <ModuleCards
          can={can}
          onOpenQrModal={() => onNavigate('qr')}
          onOpenOrdersModal={() => onNavigate('orders')}
          onOpenSetupModal={() => onNavigate('setup')}
          onOpenPrintersModal={() => onNavigate('printers')}
          onOpenStaffModal={() => onNavigate('staff')}
          onOpenProfileModal={() => onNavigate('profile')}
          onOpenPaymentModal={() => onNavigate('payment')}
        />
      </section>
    </>
  );
}
