import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { deriveOrderPaymentStatus } from '@snapprint/domain';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { createPaymentGatewayService, PaymentGatewayService } from './payment/gateway-service.js';
import { findOrderById, updateOrderPaymentSummary } from './repositories/order.repository.js';
import {
  findPaymentByGatewayOrderId,
  listPaymentsByOrder,
  updatePaymentStatus,
} from './repositories/payment.repository.js';
import { autoDispatchOrderPrintJobs } from './repositories/printer.repository.js';
import { recordWebhookEvent, updateWebhookEventStatus } from './repositories/webhook.repository.js';

export interface WebhookRouteOptions {
  db?: Db;
  config?: AppConfig;
  gateway?: PaymentGatewayService;
}

export const webhookRoutes: FastifyPluginAsync<WebhookRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const gateway = opts?.gateway ?? createPaymentGatewayService(config);

  app.post('/webhooks/razorpay', async (request, reply) => {
    const signature = (request.headers['x-razorpay-signature'] as string) || '';
    const rawPayload =
      typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

    const isValid = gateway.verifyWebhookSignature(rawPayload, signature);
    if (!isValid) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Webhook signature is invalid.',
      });
    }

    const event = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) as {
      id?: string;
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } };
        order?: { entity?: { id?: string; status?: string } };
      };
    };

    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event || 'unknown';
    const db = getEffectiveDb();

    const { alreadyProcessed } = await recordWebhookEvent(db, {
      eventId,
      eventType,
      payload: (event as Record<string, unknown>) || {},
      processedAt: new Date().toISOString(),
    });

    if (alreadyProcessed) {
      return reply.status(200).send({ received: true, duplicate: true });
    }

    try {
      const gatewayOrderId =
        event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;

      if (gatewayOrderId) {
        const payment = await findPaymentByGatewayOrderId(db, gatewayOrderId);
        if (payment) {
          if (eventType === 'payment.captured' || eventType === 'order.paid') {
            const gatewayPaymentId = event.payload?.payment?.entity?.id;
            await updatePaymentStatus(db, payment.studioId, payment.paymentId, 'SUCCEEDED', {
              gatewayPaymentId,
            });

            const order = await findOrderById(db, payment.studioId, payment.orderId);
            if (order) {
              const allPayments = await listPaymentsByOrder(db, payment.studioId, payment.orderId);
              const summary = deriveOrderPaymentStatus(order.totalAmountMinor, allPayments);
              await updateOrderPaymentSummary(
                db,
                payment.studioId,
                payment.orderId,
                summary.paidAmountMinor,
                summary.paymentStatus
              );

              if (summary.paymentStatus === 'PAID') {
                await autoDispatchOrderPrintJobs(db, payment.studioId, payment.orderId);
              }
            }
          } else if (eventType === 'payment.failed') {
            await updatePaymentStatus(db, payment.studioId, payment.paymentId, 'FAILED');
            const order = await findOrderById(db, payment.studioId, payment.orderId);
            if (order) {
              const allPayments = await listPaymentsByOrder(db, payment.studioId, payment.orderId);
              const summary = deriveOrderPaymentStatus(order.totalAmountMinor, allPayments);
              await updateOrderPaymentSummary(
                db,
                payment.studioId,
                payment.orderId,
                summary.paidAmountMinor,
                summary.paymentStatus
              );
            }
          }
        }
      }

      await updateWebhookEventStatus(db, eventId, 'PROCESSED');
      return reply.status(200).send({ received: true });
    } catch (err) {
      await updateWebhookEventStatus(
        db,
        eventId,
        'FAILED',
        err instanceof Error ? err.message : String(err)
      );
      return reply.status(500).send({
        statusCode: 500,
        code: 'WEBHOOK_RECONCILIATION_FAILED',
        message: 'Reconciliation failed; retry scheduled',
      });
    }
  });
};
