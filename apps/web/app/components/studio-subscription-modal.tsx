'use client';

import React from 'react';
import { ModalSheetShell } from './modal-sheet-shell';
import { StudioSubscriptionStatusCard } from './studio-subscription-status-card';
import { StudioSubscriptionTiers } from './studio-subscription-tiers';
import { useStudioSubscription } from './use-studio-subscription';

export interface StudioSubscriptionModalProps {
  studioId: string;
  studioName?: string;
  onClose: () => void;
  inShell?: boolean;
}

export function StudioSubscriptionModal({
  studioId,
  studioName,
  onClose,
  inShell = false,
}: StudioSubscriptionModalProps) {
  const {
    sub,
    loading,
    loadingPlan,
    activatingTrial,
    notice,
    handleActivateTrial,
    handleSelectPlan,
  } = useStudioSubscription(studioId);

  return (
    <ModalSheetShell isOpen onClose={onClose} inShell={inShell} titleId="sub-title">
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2
              id="sub-title"
              style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
            >
              Subscription & Billing
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
              {studioName || `Studio ${studioId}`}
            </div>
          </div>
          {!inShell && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#64748b',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {notice && (
          <div
            style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              backgroundColor: notice.kind === 'success' ? '#f0fdf4' : '#fef2f2',
              color: notice.kind === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${notice.kind === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {notice.text}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.875rem',
            }}
          >
            Loading subscription details...
          </div>
        ) : (
          <>
            <StudioSubscriptionStatusCard
              subscription={sub}
              activatingTrial={activatingTrial}
              onActivateTrial={handleActivateTrial}
            />

            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                {sub?.status === 'active' ? 'Extend or Upgrade Plan' : 'Select a Plan'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                Instant activation with Razorpay UPI, Cards & Netbanking
              </div>
              <StudioSubscriptionTiers loadingPlan={loadingPlan} onSelectPlan={handleSelectPlan} />
            </div>
          </>
        )}
      </div>
    </ModalSheetShell>
  );
}
