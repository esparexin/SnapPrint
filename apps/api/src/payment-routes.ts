import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  PaymentHistoryResponseSchema,
  PaymentInitiateRequestSchema,
  PaymentInitiateResponseSchema,
  PaymentRecord,
  PaymentRecordSchema,
  PaymentVerifyRequestSchema,
} from '@snapprint/contracts';
import { deriveOrderPaymentStatus, validatePaymentAttempt } from '@snapprint/domain';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { createPaymentGatewayService, PaymentGatewayService } from './payment/gateway-service.js';
import {
  findOrderBySessionAndId,
  updateOrderPaymentSummary,
} from './repositories/order.repository.js';
import {
  createPaymentRecord,
  findPaymentById,
  listPaymentsByOrder,
  updatePaymentStatus,
} from './repositories/payment.repository.js';
import { autoDispatchOrderPrintJobs } from './repositories/printer.repository.js';
import { findStudioBySlug } from './repositories/studio.repository.js';

export interface PaymentRouteOptions {
  db?: Db;
  config?: AppConfig;
  gateway?: PaymentGatewayService;
}

export const paymentRoutes: FastifyPluginAsync<PaymentRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const gateway = opts?.gateway ?? createPaymentGatewayService(config);

  // Customer: Initiate Online Payment
  app.post<{ Params: { slug: string; orderId: string } }>(
    '/public/studios/:slug/orders/:orderId/pay/initiate',
    async (request, reply) => {
      const db = getEffectiveDb();
      const studio = await findStudioBySlug(db, request.params.slug);
      if (!studio) {
        return reply
          .status(404)
          .send({ statusCode: 404, code: 'STUDIO_NOT_FOUND', message: 'Studio not found.' });
      }

      const bodyResult = PaymentInitiateRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment initiation payload.',
        });
      }

      const sessionId = (request.headers['x-session-token'] as string) || '';
      const order = await findOrderBySessionAndId(db, studio.id, sessionId, request.params.orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found for this customer session.',
        });
      }

      const paidMinor = order.paidAmountMinor ?? 0;
      const validation = validatePaymentAttempt(
        {
          totalAmountMinor: order.totalAmountMinor,
          paidAmountMinor: paidMinor,
          paymentStatus: order.paymentStatus ?? 'UNPAID',
        },
        order.totalAmountMinor - paidMinor
      );
      if (!validation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          code: validation.error,
          message: `Payment attempt invalid: ${validation.error}`,
        });
      }

      const gatewayOrder = await gateway.createGatewayOrder({
        orderId: order.orderId,
        amountMinor: validation.remainingMinor,
        currency: 'INR',
        notes: { studioId: studio.id, orderId: order.orderId, orderNumber: order.orderNumber },
      });

      const paymentId = `pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      const paymentRecord: PaymentRecord = {
        paymentId,
        orderId: order.orderId,
        studioId: studio.id,
        sessionId: order.sessionId,
        method: 'razorpay',
        amountMinor: validation.remainingMinor,
        currency: 'INR',
        status: 'CREATED',
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        createdAt: now,
        updatedAt: now,
      };

      await createPaymentRecord(db, paymentRecord);

      return reply.status(200).send(
        PaymentInitiateResponseSchema.parse({
          paymentId,
          orderId: order.orderId,
          amountMinor: validation.remainingMinor,
          currency: 'INR',
          gatewayOrderId: gatewayOrder.gatewayOrderId,
          keyId: gateway.getKeyId(),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
        })
      );
    }
  );

  // Customer: Verify Online Payment
  app.post<{ Params: { slug: string; orderId: string } }>(
    '/public/studios/:slug/orders/:orderId/pay/verify',
    async (request, reply) => {
      const db = getEffectiveDb();
      const studio = await findStudioBySlug(db, request.params.slug);
      if (!studio) {
        return reply
          .status(404)
          .send({ statusCode: 404, code: 'STUDIO_NOT_FOUND', message: 'Studio not found.' });
      }

      const bodyResult = PaymentVerifyRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment verification payload.',
        });
      }

      const { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = bodyResult.data;
      const payment = await findPaymentById(db, studio.id, paymentId);
      if (!payment || payment.orderId !== request.params.orderId) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found for this order.',
        });
      }

      const isValid = gateway.verifyPaymentSignature(
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature
      );
      if (!isValid) {
        await updatePaymentStatus(db, studio.id, paymentId, 'FAILED', {
          gatewayPaymentId,
          gatewaySignature,
        });
        const allPayments = await listPaymentsByOrder(db, studio.id, payment.orderId);
        const summary = deriveOrderPaymentStatus(payment.amountMinor, allPayments);
        await updateOrderPaymentSummary(
          db,
          studio.id,
          payment.orderId,
          summary.paidAmountMinor,
          summary.paymentStatus
        );
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_PAYMENT_SIGNATURE',
          message: 'Payment signature verification failed.',
        });
      }

      const updatedPayment = await updatePaymentStatus(db, studio.id, paymentId, 'SUCCEEDED', {
        gatewayPaymentId,
        gatewaySignature,
      });

      const allPayments = await listPaymentsByOrder(db, studio.id, payment.orderId);
      const summary = deriveOrderPaymentStatus(payment.amountMinor, allPayments);
      await updateOrderPaymentSummary(
        db,
        studio.id,
        payment.orderId,
        summary.paidAmountMinor,
        summary.paymentStatus
      );

      if (summary.paymentStatus === 'PAID') {
        await autoDispatchOrderPrintJobs(db, studio.id, payment.orderId);
      }

      return reply.status(200).send(PaymentRecordSchema.parse(updatedPayment));
    }
  );

  // Customer: Payment History / Status
  app.get<{ Params: { slug: string; orderId: string } }>(
    '/public/studios/:slug/orders/:orderId/payments',
    async (request, reply) => {
      const db = getEffectiveDb();
      const studio = await findStudioBySlug(db, request.params.slug);
      if (!studio) {
        return reply
          .status(404)
          .send({ statusCode: 404, code: 'STUDIO_NOT_FOUND', message: 'Studio not found.' });
      }

      const sessionId = (request.headers['x-session-token'] as string) || '';
      const order = await findOrderBySessionAndId(db, studio.id, sessionId, request.params.orderId);
      if (!order) {
        return reply
          .status(404)
          .send({ statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'Order was not found.' });
      }

      const payments = await listPaymentsByOrder(db, studio.id, order.orderId);
      const summary = deriveOrderPaymentStatus(order.totalAmountMinor, payments);

      return reply.status(200).send(
        PaymentHistoryResponseSchema.parse({
          payments,
          totalPaidMinor: summary.paidAmountMinor,
          paymentStatus: summary.paymentStatus,
        })
      );
    }
  );
};
