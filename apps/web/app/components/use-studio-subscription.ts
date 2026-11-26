'use client';

import { useEffect, useState } from 'react';
import { StudioSubscriptionRecord, SubscriptionPlanId } from '@snapprint/contracts';
import {
  activateStudioTrial,
  createSubscriptionOrder,
  fetchStudioSubscription,
  loadRazorpayCheckoutScript,
  verifySubscriptionPayment,
} from '../../src/subscription-client';
import { formatPlanLabel } from '../admin/admin-subscription-helpers';
import { useAutoDismiss } from '../hooks/use-auto-dismiss';

export interface UseStudioSubscriptionReturn {
  sub: StudioSubscriptionRecord | null;
  loading: boolean;
  loadingPlan: SubscriptionPlanId | null;
  activatingTrial: boolean;
  notice: { kind: 'success' | 'error'; text: string } | null;
  handleActivateTrial: () => Promise<void>;
  handleSelectPlan: (plan: SubscriptionPlanId) => Promise<void>;
}

export function useStudioSubscription(studioId: string): UseStudioSubscriptionReturn {
  const [sub, setSub] = useState<StudioSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useAutoDismiss(notice?.kind === 'success' ? notice : null, () => setNotice(null));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchStudioSubscription(studioId)
      .then((res) => {
        if (mounted) setSub(res.subscription);
      })
      .catch(() => {
        if (mounted) setNotice({ kind: 'error', text: 'Failed to load subscription status.' });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [studioId]);

  const handleActivateTrial = async () => {
    setActivatingTrial(true);
    setNotice(null);
    try {
      const res = await activateStudioTrial(studioId);
      setSub(res.subscription);
      setNotice({ kind: 'success', text: '🎉 Free Trial activated! 30 days granted.' });
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Trial activation failed',
      });
    } finally {
      setActivatingTrial(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlanId) => {
    setLoadingPlan(plan);
    setNotice(null);
    try {
      const orderRes = await createSubscriptionOrder(studioId, plan);
      await loadRazorpayCheckoutScript();
      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: orderRes.keyId,
          amount: orderRes.amountMinor,
          currency: orderRes.currency,
          name: 'SnapPrint Cloud',
          description: `${formatPlanLabel(plan)} Subscription (${orderRes.durationDays} Days)`,
          order_id: orderRes.gatewayOrderId,
          theme: { color: '#0284c7' },
          modal: { ondismiss: () => setLoadingPlan(null) },
          handler: async (resp) => {
            try {
              const verified = await verifySubscriptionPayment(studioId, {
                gatewayOrderId: resp.razorpay_order_id,
                gatewayPaymentId: resp.razorpay_payment_id,
                gatewaySignature: resp.razorpay_signature,
              });
              setSub(verified.subscription);
              setNotice({ kind: 'success', text: 'Subscription activated successfully!' });
            } catch (err) {
              setNotice({
                kind: 'error',
                text: err instanceof Error ? err.message : 'Verification failed',
              });
            } finally {
              setLoadingPlan(null);
            }
          },
        });
        rzp.open();
        return;
      }
      throw new Error('Payment gateway failed to initialize. Please check your connection.');
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to start payment.',
      });
      setLoadingPlan(null);
    }
  };

  return {
    sub,
    loading,
    loadingPlan,
    activatingTrial,
    notice,
    handleActivateTrial,
    handleSelectPlan,
  };
}
