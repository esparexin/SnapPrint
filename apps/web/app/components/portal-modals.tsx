'use client';

import React, { useEffect, useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { fetchStudio } from '../../src/workspace-client';
import { AgentPairingModal } from './agent-pairing-modal';
import { OperatorView } from './operator-portal-header';
import { OrderFulfillmentModal } from './order-fulfillment-modal';
import { PrinterManagementModal } from './printer-management-modal';
import { SetupWizardModal } from './setup-wizard-modal';
import { ShopPaymentModal } from './shop-payment-modal';
import { ShopProfileModal } from './shop-profile-modal';
import { StaffManagementModal } from './staff-management-modal';
import { StudioQrModal } from './studio-qr-modal';

const fallbackStudio = (id: string, slug?: string, name?: string): Studio => ({
  id,
  slug: slug || '',
  name: name || `Studio ${id}`,
  status: 'active',
  settings: {
    currency: 'INR',
    maxActivePrinters: 2,
    autoApproveOrders: false,
    isAcceptingOrders: true,
  },
  createdAt: '',
  updatedAt: '',
});

export interface PortalModalsProps {
  studioId?: string;
  studioName?: string;
  studioSlug?: string;
  activeView?: OperatorView;
  inShell?: boolean;
  showPairingModal?: boolean;
  onClosePairing?: () => void;
  onBackToHub?: () => void;
  onSetupComplete: (saved: StudioOnboardingProfile | null) => void;
}

export function PortalModals({
  studioId,
  studioName,
  studioSlug,
  activeView,
  inShell = false,
  showPairingModal = false,
  onClosePairing,
  onBackToHub,
  onSetupComplete,
}: PortalModalsProps) {
  const isSetup = activeView === 'setup';
  const [fetchedStudio, setFetchedStudio] = useState<Studio | null>(null);

  useEffect(() => {
    let mounted = true;
    setFetchedStudio(null);
    if (!studioId) return;
    fetchStudio(studioId)
      .then((data) => mounted && data?.studio && setFetchedStudio(data.studio))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [studioId]);

  if (!studioId && !isSetup) return null;
  const currentStudio =
    fetchedStudio || (studioId ? fallbackStudio(studioId, studioSlug, studioName) : null);
  const handleClose = () => onBackToHub?.();
  const studioKey = `${studioId || 'none'}-${fetchedStudio?.updatedAt || 'init'}`;

  const renderSection = (): React.ReactNode => {
    if (isSetup) {
      return (
        <SetupWizardModal
          studioId={studioId}
          inShell={inShell}
          onComplete={(saved) => (onSetupComplete(saved), onBackToHub?.())}
          onClose={handleClose}
        />
      );
    }
    if (!studioId || !currentStudio) return null;
    const base = { studioId, studioName: currentStudio.name, onClose: handleClose, inShell };
    const qrStudio = {
      id: studioId,
      slug: currentStudio.slug || studioSlug,
      name: currentStudio.name,
    };
    const studioFormProps = {
      key: studioKey,
      studioId,
      studio: currentStudio,
      onClose: handleClose,
      onUpdated: setFetchedStudio,
      inShell,
    };
    const views: Partial<Record<OperatorView, React.ReactNode>> = {
      orders: <OrderFulfillmentModal {...base} />,
      printers: <PrinterManagementModal {...base} />,
      staff: <StaffManagementModal {...base} />,
      qr: <StudioQrModal studio={qrStudio} onClose={handleClose} inShell={inShell} />,
      profile: <ShopProfileModal {...studioFormProps} />,
      payment: <ShopPaymentModal {...studioFormProps} />,
    };
    return activeView ? views[activeView] || null : null;
  };

  const content = (
    <>
      {renderSection()}
      {showPairingModal && studioId && (
        <AgentPairingModal
          studioId={studioId}
          studioName={currentStudio?.name || studioName}
          onClose={() => onClosePairing?.()}
        />
      )}
    </>
  );

  if (inShell && activeView) {
    return (
      <div role="tabpanel" aria-labelledby={`portal-tab-${activeView}`}>
        {content}
      </div>
    );
  }
  return content;
}
