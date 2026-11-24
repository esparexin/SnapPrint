'use client';

import React from 'react';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { ModalSheetShell } from './modal-sheet-shell';
import { ShopSetupWizard } from './shop-setup-wizard';

export interface SetupWizardModalProps {
  studioId?: string;
  onComplete: (saved: StudioOnboardingProfile | null) => void;
  onClose: () => void;
}

export function SetupWizardModal({ studioId, onComplete, onClose }: SetupWizardModalProps) {
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
