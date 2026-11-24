'use client';

import React from 'react';
import { Studio } from '@snapprint/contracts';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { OperatorView } from './operator-portal-header';
import { OrderFulfillmentModal } from './order-fulfillment-modal';
import { PrinterManagementModal } from './printer-management-modal';
import { SetupWizardModal } from './setup-wizard-modal';
import { ShopProfileModal } from './shop-profile-modal';
import { ShopPaymentModal } from './shop-payment-modal';
import { StaffManagementModal } from './staff-management-modal';
import { StudioQrModal } from './studio-qr-modal';

export interface PortalModalsProps {
  studioId?: string;
  studioName?: string;
  activeView?: OperatorView;
  onBackToHub?: () => void;
  showQrModal?: boolean;
  showOrdersModal?: boolean;
  showPrintersModal?: boolean;
  showSetupModal?: boolean;
  showStaffModal?: boolean;
  showProfileModal?: boolean;
  showPaymentModal?: boolean;
  onCloseQr?: () => void;
  onCloseOrders?: () => void;
  onClosePrinters?: () => void;
  onCloseSetup?: () => void;
  onCloseStaff?: () => void;
  onCloseProfile?: () => void;
  onClosePayment?: () => void;
  onSetupComplete: (saved: StudioOnboardingProfile | null) => void;
}

export function PortalModals({
  studioId,
  studioName,
  activeView,
  onBackToHub,
  showQrModal,
  showOrdersModal,
  showPrintersModal,
  showSetupModal,
  showStaffModal,
  showProfileModal,
  showPaymentModal,
  onCloseQr,
  onCloseOrders,
  onClosePrinters,
  onCloseSetup,
  onCloseStaff,
  onCloseProfile,
  onClosePayment,
  onSetupComplete,
}: PortalModalsProps) {
  const isSetup = activeView === 'setup' || showSetupModal;
  if (!studioId && !isSetup) return null;

  const currentStudio: Studio | null = studioId
    ? {
        id: studioId,
        slug: studioId.replace(/^studio_/, '').replace(/_/g, '-'),
        name: studioName || `Studio ${studioId}`,
        status: 'active',
        settings: {
          currency: 'INR',
          maxActivePrinters: 2,
          autoApproveOrders: false,
          isAcceptingOrders: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : null;

  const handleClose = (fn?: () => void) => {
    fn?.();
    onBackToHub?.();
  };

  return (
    <>
      {studioId && currentStudio && (
        <>
          {(activeView === 'qr' || showQrModal) && (
            <StudioQrModal
              studio={{ id: studioId, slug: currentStudio.slug, name: currentStudio.name }}
              onClose={() => handleClose(onCloseQr)}
            />
          )}
          {(activeView === 'orders' || showOrdersModal) && (
            <OrderFulfillmentModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(onCloseOrders)}
              inShell={activeView === 'orders'}
            />
          )}
          {(activeView === 'printers' || showPrintersModal) && (
            <PrinterManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(onClosePrinters)}
              inShell={activeView === 'printers'}
            />
          )}
          {(activeView === 'staff' || showStaffModal) && (
            <StaffManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(onCloseStaff)}
            />
          )}
          {(activeView === 'profile' || showProfileModal) && (
            <ShopProfileModal
              studioId={studioId}
              studio={currentStudio}
              onClose={() => handleClose(onCloseProfile)}
              onUpdated={() => handleClose(onCloseProfile)}
            />
          )}
          {(activeView === 'payment' || showPaymentModal) && (
            <ShopPaymentModal
              studioId={studioId}
              studio={currentStudio}
              onClose={() => handleClose(onClosePayment)}
              onUpdated={() => handleClose(onClosePayment)}
            />
          )}
        </>
      )}

      {isSetup && (
        <SetupWizardModal
          studioId={studioId}
          onComplete={(saved) => {
            onSetupComplete(saved);
            onBackToHub?.();
          }}
          onClose={() => handleClose(onCloseSetup)}
        />
      )}
    </>
  );
}
