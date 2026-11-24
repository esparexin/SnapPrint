'use client';

import React from 'react';

export interface StepItem {
  num: number;
  title: string;
}

interface ShopSetupStepperProps {
  currentStep: number;
  steps: StepItem[];
}

export function ShopSetupStepper({ currentStep, steps }: ShopSetupStepperProps) {
  return (
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
  );
}
