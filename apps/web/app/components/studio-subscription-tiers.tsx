'use client';

import React from 'react';
import { SubscriptionPlanId } from '@snapprint/contracts';

export interface PlanTierOption {
  id: SubscriptionPlanId;
  name: string;
  duration: string;
  price: string;
  perMonth: string;
  popular?: boolean;
}

export const PAID_TIERS: PlanTierOption[] = [
  { id: 'quarterly', name: 'Quarterly', duration: '90 Days', price: '₹999', perMonth: '₹333/mo' },
  {
    id: 'half_yearly',
    name: 'Half-Yearly',
    duration: '180 Days',
    price: '₹1,799',
    perMonth: '₹299/mo',
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    duration: '365 Days',
    price: '₹2,999',
    perMonth: '₹249/mo',
    popular: true,
  },
];

export function StudioSubscriptionTiers({
  loadingPlan,
  onSelectPlan,
}: {
  loadingPlan: SubscriptionPlanId | null;
  onSelectPlan: (plan: SubscriptionPlanId) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        marginTop: '0.75rem',
      }}
    >
      {PAID_TIERS.map((tier) => (
        <div
          key={tier.id}
          style={{
            position: 'relative',
            backgroundColor: tier.popular ? '#f0fdf4' : '#ffffff',
            border: `1.5px solid ${tier.popular ? '#16a34a' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {tier.popular && (
            <span
              style={{
                position: 'absolute',
                top: '-10px',
                right: '12px',
                backgroundColor: '#16a34a',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
              }}
            >
              BEST VALUE
            </span>
          )}
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{tier.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
              {tier.duration} access
            </div>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0.5rem 0 0.1rem',
              }}
            >
              {tier.price}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
              {tier.perMonth}
            </div>
          </div>
          <button
            type="button"
            disabled={loadingPlan !== null}
            onClick={() => onSelectPlan(tier.id)}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              minHeight: '44px',
              backgroundColor: tier.popular ? '#16a34a' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: loadingPlan !== null ? 'not-allowed' : 'pointer',
              opacity: loadingPlan !== null ? 0.7 : 1,
            }}
          >
            {loadingPlan === tier.id ? 'Processing...' : `Select ${tier.name}`}
          </button>
        </div>
      ))}
    </div>
  );
}
