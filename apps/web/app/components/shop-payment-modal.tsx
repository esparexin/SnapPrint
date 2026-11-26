'use client';

import React, { useState } from 'react';
import { Studio } from '@snapprint/contracts';
import { updateStudioProfile as updateProfileApi } from '../../src/studio-client';
import { updateStudioSettings } from '../../src/workspace-client';
import { useAutoDismiss } from '../hooks/use-auto-dismiss';
import { ModalSheetShell } from './modal-sheet-shell';
import { getNoticeBoxStyle } from './operator-portal-styles';
import { ShopPaymentModalFooter } from './shop-payment-modal-footer';
import { ShopPaymentModalHeader } from './shop-payment-modal-header';
import { ShopRazorpayForm } from './shop-razorpay-form';

interface ShopPaymentModalProps {
  studioId: string;
  studio: Studio;
  onClose: () => void;
  onUpdated: (updated: Studio) => void;
  inShell?: boolean;
}

export function ShopPaymentModal({
  studioId,
  studio,
  onClose,
  onUpdated,
  inShell = false,
}: ShopPaymentModalProps) {
  const p = studio.payment;
  const [keyId, setKeyId] = useState(p?.razorpayKeyId || '');
  const [isConfirmed, setIsConfirmed] = useState(p?.isRazorpayConfirmed ?? false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'saved'; text: string } | null>(null);

  useAutoDismiss(notice?.kind === 'saved' ? notice : null, () => setNotice(null));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payment = {
        enableCounterPayment: true,
        enableOnlinePayment: isConfirmed,
        isRazorpayConfirmed: isConfirmed,
        ...(keyId.trim() ? { razorpayKeyId: keyId.trim() } : {}),
      };
      await updateProfileApi(studioId, { payment });
      const updated = await updateStudioSettings(studioId, {
        paymentPolicy: 'payment_required',
        onlinePaymentEnabled: isConfirmed,
        counterPaymentEnabled: true,
      });
      const mergedStudio: Studio = { ...updated, payment };
      onUpdated(mergedStudio);
      if (inShell) setNotice({ kind: 'saved', text: '✓ Payment settings saved.' });
      else onClose();
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to update payment settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheetShell
      onClose={onClose}
      titleId="payment-modal-title"
      maxWidth="520px"
      inShell={inShell}
      hideCloseButton={true}
      contentStyle={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <ShopPaymentModalHeader
        studioName={studio.name}
        studioSlug={studio.slug}
        onClose={inShell ? undefined : onClose}
      />
      <div style={{ padding: '20px', overflowY: inShell ? 'visible' : 'auto' }}>
        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            style={getNoticeBoxStyle(notice.kind)}
          >
            {notice.text}
          </div>
        )}
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <ShopRazorpayForm
            studioId={studioId}
            isConfirmed={isConfirmed}
            keyId={keyId}
            onKeyIdChange={(newKey) => {
              setKeyId(newKey);
              if (newKey !== p?.razorpayKeyId) setIsConfirmed(false);
            }}
            onVerificationSuccess={() => {
              setIsConfirmed(true);
              setNotice({
                kind: 'saved',
                text: '✓ Gateway verified. Click "Save Payment Settings" to persist.',
              });
            }}
            onError={(msg) => setNotice(msg ? { kind: 'error', text: msg } : null)}
          />
          <ShopPaymentModalFooter saving={saving} onClose={inShell ? undefined : onClose} />
        </form>
      </div>
    </ModalSheetShell>
  );
}
