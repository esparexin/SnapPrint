'use client';

import React, { useEffect, useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { fetchStudio } from '../../src/workspace-client';
import { OperatorView } from './operator-portal-header';
import { OrderFulfillmentModal } from './order-fulfillment-modal';
import { PrinterManagementModal } from './printer-management-modal';
import { SetupWizardModal } from './setup-wizard-modal';
import { ShopProfileModal } from './shop-profile-modal';
import { ShopPaymentModal } from './shop-payment-modal';
import { StaffManagementModal } from './staff-management-modal';
import { StudioQrModal } from './studio-qr-modal';

const EMPTY_SETTINGS = {
  currency: 'INR',
  maxActivePrinters: 2,
  autoApproveOrders: false,
  isAcceptingOrders: true,
};

export interface PortalModalsProps {
  studioId?: string;
  studioName?: string;
  studioSlug?: string;
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

export function PortalModals(props: PortalModalsProps) {
  const { studioId, studioName, studioSlug, activeView, onBackToHub, onSetupComplete } = props;
  const isSetup = activeView === 'setup' || props.showSetupModal;
  const [fetchedStudio, setFetchedStudio] = useState<Studio | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!studioId) return setFetchedStudio(null);
    fetchStudio(studioId)
      .then((data) => mounted && data?.studio && setFetchedStudio(data.studio))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [studioId]);

  if (!studioId && !isSetup) return null;

  const currentStudio: Studio | null =
    fetchedStudio ||
    (studioId
      ? {
          id: studioId,
          slug: studioSlug || '',
          name: studioName || `Studio ${studioId}`,
          status: 'active',
          settings: EMPTY_SETTINGS,
          createdAt: '',
          updatedAt: '',
        }
      : null);

  const handleClose = (fn?: () => void) => {
    fn?.();
    onBackToHub?.();
  };

  return (
    <>
      {studioId && currentStudio && (
        <>
          {(activeView === 'qr' || props.showQrModal) && (
            <StudioQrModal
              studio={{
                id: studioId,
                slug: currentStudio.slug || studioSlug,
                name: currentStudio.name,
              }}
              onClose={() => handleClose(props.onCloseQr)}
            />
          )}
          {(activeView === 'orders' || props.showOrdersModal) && (
            <OrderFulfillmentModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(props.onCloseOrders)}
              inShell={activeView === 'orders'}
            />
          )}
          {(activeView === 'printers' || props.showPrintersModal) && (
            <PrinterManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(props.onClosePrinters)}
              inShell={activeView === 'printers'}
            />
          )}
          {(activeView === 'staff' || props.showStaffModal) && (
            <StaffManagementModal
              studioId={studioId}
              studioName={currentStudio.name}
              onClose={() => handleClose(props.onCloseStaff)}
            />
          )}
          {(activeView === 'profile' || props.showProfileModal) && (
            <ShopProfileModal
              studioId={studioId}
              studio={currentStudio}
              onClose={() => handleClose(props.onCloseProfile)}
              onUpdated={() => handleClose(props.onCloseProfile)}
            />
          )}
          {(activeView === 'payment' || props.showPaymentModal) && (
            <ShopPaymentModal
              studioId={studioId}
              studio={currentStudio}
              onClose={() => handleClose(props.onClosePayment)}
              onUpdated={() => handleClose(props.onClosePayment)}
            />
          )}
        </>
      )}

      {isSetup && (
        <SetupWizardModal
          studioId={studioId}
          onComplete={(saved) => (onSetupComplete(saved), onBackToHub?.())}
          onClose={() => handleClose(props.onCloseSetup)}
        />
      )}
    </>
  );
}
