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
      <section>
        <h2 style={portalStyles.sectionHeading}>Studio Modules (Permission-Gated)</h2>
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
