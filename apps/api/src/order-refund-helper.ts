import { Db } from 'mongodb';
import { loadConfig } from './config.js';
import {
  createPaymentGatewayService,
  PaymentGatewayService,
  resolveEffectiveGateway,
} from './payment/gateway-service.js';
import { updateOrderPaymentSummary } from './repositories/order.repository.js';
import { listPaymentsByOrder, updatePaymentStatus } from './repositories/payment.repository.js';
import { findStudioDocumentById } from './repositories/studio-onboarding.repository.js';

export interface OrderRefundResult {
  refunded: boolean;
  refundId?: string;
  amountMinor?: number;
  reason?: string;
}

/**
 * Executes programmatic payment refund when an online-paid order is cancelled.
 * Resolves the studio's own Razorpay merchant credentials (SSOT multi-tenancy).
 */
export async function processOrderCancellationRefund(
  db: Db,
  studioId: string,
  orderId: string,
  cancelReason?: string,
  overrideGateway?: PaymentGatewayService
): Promise<OrderRefundResult> {
  const payments = await listPaymentsByOrder(db, studioId, orderId);
  const paidOnlinePayment = payments.find(
    (p) => p.method === 'razorpay' && p.status === 'SUCCEEDED' && Boolean(p.gatewayPaymentId)
  );

  if (!paidOnlinePayment?.gatewayPaymentId) {
    return { refunded: false };
  }

  const studioDoc = await findStudioDocumentById(db, studioId);
  const config = loadConfig();
  const fallback = overrideGateway ?? createPaymentGatewayService(config);
  const gw = resolveEffectiveGateway(
    fallback,
    studioDoc?.payment?.razorpayKeyId,
    studioDoc?.razorpayKeySecret,
    config.razorpayWebhookSecret
  );

  try {
    const refundRes = await gw.refundPayment({
      paymentId: paidOnlinePayment.gatewayPaymentId,
      amountMinor: paidOnlinePayment.amountMinor,
      notes: {
        orderId,
        reason: cancelReason || 'Order cancelled by shop operator',
      },
    });

    const now = new Date();
    await updatePaymentStatus(db, studioId, paidOnlinePayment.paymentId, 'REFUNDED', {
      refundId: refundRes.refundId,
      refundedAt: now,
    });

    await updateOrderPaymentSummary(db, studioId, orderId, 0, 'REFUNDED');

    return {
      refunded: true,
      refundId: refundRes.refundId,
      amountMinor: paidOnlinePayment.amountMinor,
      reason: `Refund ${refundRes.refundId} processed for ₹${(paidOnlinePayment.amountMinor / 100).toFixed(2)}.`,
    };
  } catch (err) {
    return {
      refunded: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
