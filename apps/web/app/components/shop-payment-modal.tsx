'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { updateStudioProfile as updateProfileApi } from '../../src/studio-client';
import { updateStudioSettings } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { ShopPaymentPolicyFields } from './shop-payment-policy-fields';
import { ShopRazorpayForm } from './shop-razorpay-form';

interface ShopPaymentModalProps {
  studioId: string;
  studio: Studio;
  onClose: () => void;
  onUpdated: (updated: Studio) => void;
}

export function ShopPaymentModal({ studioId, studio, onClose, onUpdated }: ShopPaymentModalProps) {
  const initialSettings = studio.settings;
  const initialPayment = (
    studio as unknown as {
      payment?: { isRazorpayConfirmed?: boolean; razorpayKeyId?: string };
    }
  ).payment;

  const [paymentPolicy, setPaymentPolicy] = useState<'payment_required' | 'pay_at_counter'>(
    initialSettings?.paymentPolicy || 'payment_required'
  );
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(
    initialSettings?.onlinePaymentEnabled ?? true
  );
  const [counterPaymentEnabled, setCounterPaymentEnabled] = useState(
    initialSettings?.counterPaymentEnabled ?? true
  );
  const [keyId, setKeyId] = useState(initialPayment?.razorpayKeyId || '');
  const [isConfirmed, setIsConfirmed] = useState(initialPayment?.isRazorpayConfirmed ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStudioSettings(studioId, {
        paymentPolicy,
        onlinePaymentEnabled,
        counterPaymentEnabled,
      });

      await updateProfileApi(studioId, {
        payment: {
          enableCounterPayment: counterPaymentEnabled,
          enableOnlinePayment: onlinePaymentEnabled && isConfirmed,
          isRazorpayConfirmed: isConfirmed,
          ...(keyId.trim() ? { razorpayKeyId: keyId.trim() } : {}),
        },
      }).catch(() => null);

      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment settings.');
    } finally {
      setSaving(false);
    }
  };

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              id="payment-modal-title"
              style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
            >
              Payment & Gateway Settings
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              {studio.name} ({studio.slug})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dialog-close-btn"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSave}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <ShopPaymentPolicyFields
              paymentPolicy={paymentPolicy}
              setPaymentPolicy={setPaymentPolicy}
              onlinePaymentEnabled={onlinePaymentEnabled}
              setOnlinePaymentEnabled={setOnlinePaymentEnabled}
              counterPaymentEnabled={counterPaymentEnabled}
              setCounterPaymentEnabled={setCounterPaymentEnabled}
            />

            <ShopRazorpayForm
              studioId={studioId}
              isConfirmed={isConfirmed}
              keyId={keyId}
              onKeyIdChange={setKeyId}
              onVerificationSuccess={() => setIsConfirmed(true)}
              onError={setError}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Payment Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
