'use client';

import React, { useState } from 'react';
import { Studio, StudioPrintRatesContract } from '@snapprint/contracts';
import { updateStudioProfile as updateProfileApi } from '../../src/studio-client';
import { updateStudioSettings } from '../../src/workspace-client';
import { ModalSheetShell } from './modal-sheet-shell';
import { DEFAULT_A4_RATES, getNoticeBoxStyle } from './operator-portal-styles';
import { ShopPaymentModalFooter } from './shop-payment-modal-footer';
import { ShopPaymentModalHeader } from './shop-payment-modal-header';
import { ShopPaymentPolicyFields } from './shop-payment-policy-fields';
import { ShopPrintRatesFields } from './shop-print-rates-fields';
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
  const s = studio.settings;
  const p = (studio as { payment?: { isRazorpayConfirmed?: boolean; razorpayKeyId?: string } })
    .payment;
  const [paymentPolicy, setPaymentPolicy] = useState<'payment_required' | 'pay_at_counter'>(
    s?.paymentPolicy || 'payment_required'
  );
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(s?.onlinePaymentEnabled ?? true);
  const [counterPaymentEnabled, setCounterPaymentEnabled] = useState(
    s?.counterPaymentEnabled ?? true
  );
  const [printRates, setPrintRates] = useState<StudioPrintRatesContract>(
    s?.printRates || DEFAULT_A4_RATES
  );
  const [keyId, setKeyId] = useState(p?.razorpayKeyId || '');
  const [isConfirmed, setIsConfirmed] = useState(p?.isRazorpayConfirmed ?? false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'saved'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const updated = await updateStudioSettings(studioId, {
        paymentPolicy,
        onlinePaymentEnabled,
        counterPaymentEnabled,
        printRates,
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
          <ShopPaymentPolicyFields
            paymentPolicy={paymentPolicy}
            setPaymentPolicy={setPaymentPolicy}
            onlinePaymentEnabled={onlinePaymentEnabled}
            setOnlinePaymentEnabled={setOnlinePaymentEnabled}
            counterPaymentEnabled={counterPaymentEnabled}
            setCounterPaymentEnabled={setCounterPaymentEnabled}
          />
          <ShopPrintRatesFields printRates={printRates} onChange={setPrintRates} />
          <ShopRazorpayForm
            studioId={studioId}
            isConfirmed={isConfirmed}
            keyId={keyId}
            onKeyIdChange={setKeyId}
            onVerificationSuccess={() => setIsConfirmed(true)}
            onError={(msg) => setNotice(msg ? { kind: 'error', text: msg } : null)}
          />
          <ShopPaymentModalFooter saving={saving} onClose={inShell ? undefined : onClose} />
        </form>
      </div>
    </ModalSheetShell>
  );
}
