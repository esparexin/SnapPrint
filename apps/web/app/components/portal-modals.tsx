'use client';

import React from 'react';
import { Studio } from '@snapprint/contracts';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { ModalSheetShell } from './modal-sheet-shell';
import { OrderFulfillmentModal } from './order-fulfillment-modal';
import { PrinterManagementModal } from './printer-management-modal';
import { ShopProfileModal } from './shop-profile-modal';
import { ShopPaymentModal } from './shop-payment-modal';
import { ShopSetupWizard } from './shop-setup-wizard';
import { StaffManagementModal } from './staff-management-modal';
import { StudioQrModal } from './studio-qr-modal';

export interface PortalModalsProps {
  studioId?: string;
  studioName?: string;
  showQrModal: boolean;
  showOrdersModal: boolean;
  showPrintersModal: boolean;
  showSetupModal: boolean;
  showStaffModal: boolean;
  showProfileModal: boolean;
  showPaymentModal?: boolean;
  onCloseQr: () => void;
  onCloseOrders: () => void;
  onClosePrinters: () => void;
  onCloseSetup: () => void;
  onCloseStaff: () => void;
  onCloseProfile: () => void;
  onClosePayment?: () => void;
  onSetupComplete: (saved: StudioOnboardingProfile | null) => void;
}

function SetupWizardModal({
  studioId,
  onComplete,
  onClose,
}: {
  studioId?: string;
  onComplete: (saved: StudioOnboardingProfile | null) => void;
  onClose: () => void;
}) {
  return (
    <ModalSheetShell
      onClose={onClose}
      titleId="wizard-title"
      maxWidth="620px"
      enableSwipeDown={false}
      contentStyle={{ width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <ShopSetupWizard
        initialStudio={studioId ? { id: studioId } : undefined}
        onComplete={onComplete}
        onCancel={onClose}
      />
    </ModalSheetShell>
  );
}

export function PortalModals({
  studioId,
  studioName,
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
  if (!studioId && !showSetupModal) return null;

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

  return (
    <>
      {studioId && currentStudio && (
        <>
          {showQrModal && (
            <StudioQrModal
              studio={{ id: studioId, slug: currentStudio.slug, name: currentStudio.name }}
              onClose={onCloseQr}
            />
          )}

          {showOrdersModal && (
            <OrderFulfillmentModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={onCloseOrders}
            />
          )}

          {showPrintersModal && (
            <PrinterManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={onClosePrinters}
            />
          )}

          {showStaffModal && (
            <StaffManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={onCloseStaff}
            />
          )}

          {showProfileModal && (
            <ShopProfileModal
              studioId={studioId}
              studio={currentStudio}
              onClose={onCloseProfile}
              onUpdated={() => onCloseProfile()}
            />
          )}

          {showPaymentModal && onClosePayment && (
            <ShopPaymentModal
              studioId={studioId}
              studio={currentStudio}
              onClose={onClosePayment}
              onUpdated={() => onClosePayment()}
            />
          )}
        </>
      )}

      {showSetupModal && (
        <SetupWizardModal studioId={studioId} onComplete={onSetupComplete} onClose={onCloseSetup} />
      )}
    </>
  );
}
