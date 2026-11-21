import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  CounterPaymentRequestSchema,
  OrderRecordSchema,
  PaymentHistoryResponseSchema,
  PaymentRecord,
  PaymentRecordSchema,
} from '@snapprint/contracts';
import { deriveOrderPaymentStatus, validatePaymentAttempt } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { findOrderById, updateOrderPaymentSummary } from './repositories/order.repository.js';
import { createPaymentRecord, listPaymentsByOrder } from './repositories/payment.repository.js';

export interface OperatorPaymentRouteOptions {
  db?: Db;
}

export const operatorPaymentRoutes: FastifyPluginAsync<OperatorPaymentRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // Record Counter Payment (Cash or Counter UPI)
  app.post<{ Params: { studioId: string; orderId: string } }>(
    '/studios/:studioId/orders/:orderId/payments/counter',
    { preHandler: [requireStudioPermission('record_payments', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.studioId!;
      const bodyResult = CounterPaymentRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid counter payment payload.',
        });
      }

      const order = await findOrderById(db, studioId, request.params.orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      const validation = validatePaymentAttempt(
        {
          totalAmountMinor: order.totalAmountMinor,
          paidAmountMinor: order.paidAmountMinor ?? 0,
          paymentStatus: order.paymentStatus ?? 'UNPAID',
        },
        bodyResult.data.amountMinor
      );
      if (!validation.valid) {
        return reply.status(400).send({
          statusCode: 400,
          code: validation.error,
          message: `Payment attempt invalid: ${validation.error}`,
        });
      }

      const paymentId = `pay_cnt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      const paymentRecord: PaymentRecord = {
        paymentId,
        orderId: order.orderId,
        studioId,
        sessionId: order.sessionId,
        method: bodyResult.data.method,
        amountMinor: bodyResult.data.amountMinor,
        currency: 'INR',
        status: 'SUCCEEDED',
        recordedByUserId: request.operator?.user.id,
        notes: bodyResult.data.notes,
        createdAt: now,
        updatedAt: now,
      };

      const createdPayment = await createPaymentRecord(db, paymentRecord);
      const allPayments = await listPaymentsByOrder(db, studioId, order.orderId);
      const summary = deriveOrderPaymentStatus(order.totalAmountMinor, allPayments);
      const updatedOrder = await updateOrderPaymentSummary(
        db,
        studioId,
        order.orderId,
        summary.paidAmountMinor,
        summary.paymentStatus
      );

      return reply.status(200).send({
        payment: PaymentRecordSchema.parse(createdPayment),
        order: updatedOrder ? OrderRecordSchema.parse(updatedOrder) : null,
      });
    }
  );

  // List payments for an order (Operator audit trail)
  app.get<{ Params: { studioId: string; orderId: string } }>(
    '/studios/:studioId/orders/:orderId/payments',
    { preHandler: [requireStudioPermission('view_orders', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.studioId!;
      const order = await findOrderById(db, studioId, request.params.orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      const payments = await listPaymentsByOrder(db, studioId, order.orderId);
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
