import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { Db } from 'mongodb';
import {
  PaymentInitiateRequestSchema,
  PaymentInitiateResponseSchema,
  PaymentVerifyRequestSchema,
  PaymentRecordSchema,
  PaymentHistoryResponseSchema,
} from '@snapprint/contracts';
import { deriveOrderPaymentStatus, validatePaymentAttempt } from '@snapprint/domain';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import {
  createPaymentGatewayService,
  PaymentGatewayService,
  resolveEffectiveGateway,
} from './payment/gateway-service.js';
import { resolveSessionIdFromHeader } from './session-token.js';
import {
  findOrderBySessionAndId,
  createPaymentRecord,
  findPaymentById,
  listPaymentsByOrder,
  updateOrderPaymentSummary,
  updatePaymentStatus,
} from './repositories/payment.repository.js';
import { autoDispatchOrderPrintJobs } from './repositories/printer.repository.js';
import { findStudioDocumentBySlug } from './repositories/studio.repository.js';
import { checkStudioCheckoutAvailability } from './repositories/subscription.repository.js';

export interface PaymentRouteOptions {
  config?: AppConfig;
  db?: Db;
  gateway?: PaymentGatewayService;
}

const sendErr = (reply: FastifyReply, code: number, errCode: string, msg: string) =>
  reply.status(code).send({ statusCode: code, code: errCode, message: msg });

async function syncPayment(db: Db, studioId: string, orderId: string, totalAmountMinor: number) {
  const allPayments = await listPaymentsByOrder(db, studioId, orderId);
  const s = deriveOrderPaymentStatus(totalAmountMinor, allPayments);
  await updateOrderPaymentSummary(db, studioId, orderId, s.paidAmountMinor, s.paymentStatus);
  return s;
}

export const paymentRoutes: FastifyPluginAsync<PaymentRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const gateway = opts?.gateway ?? createPaymentGatewayService(config);

  const getStudioAndGw = async (db: Db, slug: string) => {
    const doc = await findStudioDocumentBySlug(db, slug);
    if (!doc) return null;
    const studio = {
      id: doc.id,
      slug: doc.slug,
      name: doc.name,
      status: doc.status,
      settings: doc.settings,
    };
    const gw =
      opts?.gateway ??
      resolveEffectiveGateway(
        gateway,
        doc.payment?.razorpayKeyId,
        doc.razorpayKeySecret,
        config.razorpayWebhookSecret
      );
    return { doc, studio, gw };
  };

  // Customer: Initiate Online Payment
  app.post<{ Params: { slug: string; orderId: string } }>(
    '/public/studios/:slug/orders/:orderId/pay/initiate',
    async (request, reply) => {
      const db = getEffectiveDb();
      const ctx = await getStudioAndGw(db, request.params.slug);
      if (!ctx) return sendErr(reply, 404, 'STUDIO_NOT_FOUND', 'Studio not found.');
      const { studio, gw } = ctx;

      const avail = await checkStudioCheckoutAvailability(db, studio);
      if (!avail.allowed) {
        return sendErr(
          reply,
          403,
          avail.reason,
          `Studio checkout is currently unavailable: ${avail.reason}`
        );
      }

      const bodyResult = PaymentInitiateRequestSchema.safeParse(request.body);
      if (!bodyResult.success) return sendErr(reply, 400, 'VALIDATION_ERROR', 'Invalid payload.');

      const tokenHeader = request.headers['x-session-token'] as string | undefined;
      const sessionId =
        resolveSessionIdFromHeader(tokenHeader, config.sessionSecret, studio.id) || '';
      const order = await findOrderBySessionAndId(db, studio.id, sessionId, request.params.orderId);
      if (!order) return sendErr(reply, 404, 'ORDER_NOT_FOUND', 'Order not found.');

      const paidMinor = order.paidAmountMinor ?? 0;
      const validation = validatePaymentAttempt(
        {
          totalAmountMinor: order.totalAmountMinor,
          paidAmountMinor: paidMinor,
          paymentStatus: order.paymentStatus ?? 'UNPAID',
          status: order.status,
        },
        order.totalAmountMinor - paidMinor
      );

      if (!validation.allowed) {
        return sendErr(
          reply,
          400,
          validation.reason,
          `Payment attempt rejected: ${validation.reason}`
        );
      }

      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const gatewayOrder = await gw.createOrder({
        amountMinor: validation.remainingMinor,
        currency: 'INR',
        receipt: paymentId,
        notes: { studioId: studio.id, orderId: order.orderId, paymentId },
      });

      const now = new Date().toISOString();
      await createPaymentRecord(db, {
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
      });

      return reply.status(200).send(
        PaymentInitiateResponseSchema.parse({
          paymentId,
          orderId: order.orderId,
          amountMinor: validation.remainingMinor,
          currency: 'INR',
          gatewayOrderId: gatewayOrder.gatewayOrderId,
          keyId: gw.getKeyId(),
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
      const ctx = await getStudioAndGw(db, request.params.slug);
      if (!ctx) return sendErr(reply, 404, 'STUDIO_NOT_FOUND', 'Studio not found.');
      const { studio, gw } = ctx;

      const bodyResult = PaymentVerifyRequestSchema.safeParse(request.body);
      if (!bodyResult.success) return sendErr(reply, 400, 'VALIDATION_ERROR', 'Invalid payload.');

      const { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = bodyResult.data;
      const payment = await findPaymentById(db, studio.id, paymentId);
      if (!payment || payment.orderId !== request.params.orderId) {
        return sendErr(reply, 404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
      }

      const isValid = gw.verifyPaymentSignature(gatewayOrderId, gatewayPaymentId, gatewaySignature);
      if (!isValid) {
        await updatePaymentStatus(db, studio.id, paymentId, 'FAILED', {
          gatewayPaymentId,
          gatewaySignature,
        });
        await syncPayment(db, studio.id, payment.orderId, payment.amountMinor);
        return sendErr(reply, 400, 'INVALID_PAYMENT_SIGNATURE', 'Signature failed.');
      }

      const capturedAt = new Date().toISOString();
      const updatedPayment = await updatePaymentStatus(db, studio.id, paymentId, 'SUCCEEDED', {
        gatewayPaymentId,
        gatewaySignature,
        gatewayCapturedAt: capturedAt,
      });

      const summary = await syncPayment(db, studio.id, payment.orderId, payment.amountMinor);
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
      const ctx = await getStudioAndGw(db, request.params.slug);
      if (!ctx) return sendErr(reply, 404, 'STUDIO_NOT_FOUND', 'Studio not found.');
      const { doc } = ctx;

      const tokenHeader = request.headers['x-session-token'] as string | undefined;
      const sessionId = resolveSessionIdFromHeader(tokenHeader, config.sessionSecret, doc.id) || '';
      const order = await findOrderBySessionAndId(db, doc.id, sessionId, request.params.orderId);
      if (!order) return sendErr(reply, 404, 'ORDER_NOT_FOUND', 'Order was not found.');

      const payments = await listPaymentsByOrder(db, doc.id, order.orderId);
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
