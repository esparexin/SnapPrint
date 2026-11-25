'use client';

import React, { useState } from 'react';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { ShopActivatedCard } from './shop-activated-card';
import { ShopActivationStep } from './shop-activation-step';
import { ShopCapabilitiesStep } from './shop-capabilities-step';
import { ShopDetailsStep } from './shop-details-step';
import { ShopPaymentStep } from './shop-payment-step';
import { ShopSetupHeader } from './shop-setup-header';
import { ShopSetupStepper } from './shop-setup-stepper';

interface ShopSetupWizardProps {
  initialStudio?: StudioOnboardingProfile | { id: string };
  onComplete: (activatedStudio: StudioOnboardingProfile | null) => void;
  onCancel?: () => void;
  inShell?: boolean;
}

export function ShopSetupWizard({
  initialStudio,
  onComplete,
  onCancel,
  inShell = false,
}: ShopSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialStudio ? 2 : 1);
  const [studio, setStudio] = useState<StudioOnboardingProfile | null>(
    initialStudio && 'name' in initialStudio ? (initialStudio as StudioOnboardingProfile) : null
  );
  const [activatedResult, setActivatedResult] = useState<{
    studioId: string;
    status: string;
    publicUrl: string;
  } | null>(null);

  const steps = [
    { num: 1, title: 'Shop Details' },
    { num: 2, title: 'Capabilities' },
    { num: 3, title: 'Payment Modes' },
    { num: 4, title: 'Activation' },
  ];

  if (activatedResult) {
    return (
      <ShopActivatedCard
        publicUrl={activatedResult.publicUrl}
        onGoToDashboard={() => onComplete(studio)}
      />
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: inShell ? '0' : '0.75rem',
        padding: '1.25rem',
        border: inShell ? 'none' : '1px solid #e5e7eb',
        boxShadow: inShell ? 'none' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        maxHeight: inShell ? 'none' : 'min(90vh, calc(100dvh - 2rem))',
        overflowY: inShell ? 'visible' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <ShopSetupHeader onCancel={onCancel} />

      <ShopSetupStepper currentStep={currentStep} steps={steps} />

      {currentStep === 1 && (
        <ShopDetailsStep
          studioId={studio?.id}
          initialValues={{
            name: studio?.name,
            slug: studio?.slug,
            tagline: studio?.tagline,
            city: studio?.location?.city,
            phone: studio?.contactPhone,
          }}
          onSuccess={(saved) => {
            setStudio(saved);
            setCurrentStep(2);
          }}
          onCancel={onCancel}
        />
      )}

      {currentStep === 2 && studio && (
        <ShopCapabilitiesStep
          studioId={studio.id}
          initialCapabilities={studio.capabilities}
          onSuccess={(saved) => {
            setStudio(saved);
            setCurrentStep(3);
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 3 && studio && (
        <ShopPaymentStep
          studioId={studio.id}
          initialPayment={studio.payment}
          onSuccess={(saved) => {
            setStudio(saved);
            setCurrentStep(4);
          }}
          onBack={() => setCurrentStep(2)}
        />
      )}

      {currentStep === 4 && studio && (
        <ShopActivationStep
          studio={studio}
          onActivated={(res) => setActivatedResult(res)}
          onBack={() => setCurrentStep(3)}
        />
      )}
    </div>
  );
}
