'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { updateStudioProfile as updateProfileApi } from '../../src/studio-client';
import { updateStudioSettings } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { ShopPaymentModalFooter } from './shop-payment-modal-footer';
import { ShopPaymentModalHeader } from './shop-payment-modal-header';
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
        style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <ShopPaymentModalHeader
          studioName={studio.name}
          studioSlug={studio.slug}
          onClose={onClose}
        />

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

            <ShopPaymentModalFooter saving={saving} onClose={onClose} />
          </form>
        </div>
      </div>
    </div>
  );
}
