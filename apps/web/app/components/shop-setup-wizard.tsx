'use client';

import React, { useState } from 'react';
import { StudioOnboardingProfile } from '../../src/studio-client';
import { ShopActivatedCard } from './shop-activated-card';
import { ShopActivationStep } from './shop-activation-step';
import { ShopCapabilitiesStep } from './shop-capabilities-step';
import { ShopDetailsStep } from './shop-details-step';
import { ShopPaymentStep } from './shop-payment-step';

interface ShopSetupWizardProps {
  initialStudio?: StudioOnboardingProfile | { id: string };
  onComplete: (activatedStudio: StudioOnboardingProfile | null) => void;
  onCancel?: () => void;
}

export function ShopSetupWizard({ initialStudio, onComplete, onCancel }: ShopSetupWizardProps) {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      style={{
        background: '#ffffff',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2
            id="wizard-title"
            style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}
          >
            Shop Onboarding & Guided Setup
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.8125rem' }}>
            Configure your shop profile, limits, and payment methods in 4 quick steps.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close setup wizard"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#9ca3af',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Stepper Progress */}
      <nav
        aria-label="Setup steps"
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}
      >
        {steps.map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '0.5rem 0.25rem',
                borderBottom: `3px solid ${isActive ? '#0284c7' : isDone ? '#10b981' : '#e5e7eb'}`,
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive || isDone ? 700 : 500,
                  color: isActive ? '#0284c7' : isDone ? '#10b981' : '#9ca3af',
                  display: 'block',
                }}
              >
                {isDone ? `✓ Step ${s.num}` : `Step ${s.num}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block' }}>
                {s.title}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Step Contents */}
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
