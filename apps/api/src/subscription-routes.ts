import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { z } from 'zod';
import {
  CreateSubscriptionOrderRequestSchema,
  DEFAULT_PLAN_PRICES_PAISE,
  PLAN_DURATIONS_DAYS,
} from '@snapprint/contracts';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { createPaymentGatewayService, PaymentGatewayService } from './payment/gateway-service.js';
import { requireStudioPermission } from './plugins/authorization.js';
import {
  applySubscriptionRenewal,
  createSubscriptionOrder,
  findSubscriptionOrderByGatewayOrderId,
  getStudioSubscription,
  updateSubscriptionOrderStatus,
} from './repositories/subscription.repository.js';

export interface SubscriptionRouteOptions {
  db?: Db;
  config?: AppConfig;
  gateway?: PaymentGatewayService;
}

const VerifySubscriptionPaymentRequestSchema = z.object({
  gatewayOrderId: z.string().min(1),
  gatewayPaymentId: z.string().min(1),
  gatewaySignature: z.string().min(1),
});

export const subscriptionRoutes: FastifyPluginAsync<SubscriptionRouteOptions> = async (
  app,
  opts
) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const gateway = opts?.gateway ?? createPaymentGatewayService(config);

  // 1. Get Studio Subscription
  app.get<{ Params: { studioId: string } }>(
    '/studios/:studioId/subscription',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.params.studioId;
      const sub = await getStudioSubscription(db, studioId);
      return reply.send({ subscription: sub });
    }
  );

  // 2. Activate Free Trial
  app.post<{ Params: { studioId: string } }>(
    '/studios/:studioId/subscription/trial',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.params.studioId;
      const existing = await getStudioSubscription(db, studioId);
      if (existing) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'TRIAL_ALREADY_USED',
          message: 'Studio has already activated a trial or subscription.',
        });
      }

      const activated = await applySubscriptionRenewal(db, studioId, 'free', new Date());
      return reply.status(201).send({ subscription: activated });
    }
  );

  // 3. Create Subscription Renewal Order
  app.post<{ Params: { studioId: string } }>(
    '/studios/:studioId/subscription/order',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.params.studioId;
      const bodyResult = CreateSubscriptionOrderRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid subscription order payload.',
        });
      }

      const { plan } = bodyResult.data;
      if (plan === 'free') {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_PLAN',
          message: 'Free plan trial cannot be purchased via order.',
        });
      }

      const amountMinor = DEFAULT_PLAN_PRICES_PAISE[plan];
      const durationDays = PLAN_DURATIONS_DAYS[plan];
      const subscriptionOrderId = `subord_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

      const gatewayOrder = await gateway.createGatewayOrder({
        orderId: subscriptionOrderId,
        amountMinor,
        currency: 'INR',
        notes: { studioId, plan, subscriptionOrderId },
      });

      await createSubscriptionOrder(db, {
        subscriptionOrderId,
        studioId,
        plan,
        durationDays,
        amountMinor,
        currency: 'INR',
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        status: 'CREATED',
      });

      return reply.status(201).send({
        subscriptionOrderId,
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        amountMinor,
        currency: 'INR',
        keyId: gateway.getKeyId(),
        plan,
        durationDays,
      });
    }
  );

  // 4. Verify Subscription Payment Signature
  app.post<{ Params: { studioId: string } }>(
    '/studios/:studioId/subscription/verify',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.params.studioId;
      const bodyResult = VerifySubscriptionPaymentRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment verification payload.',
        });
      }

      const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = bodyResult.data;
      const isValid = gateway.verifyPaymentSignature(
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature
      );
      if (!isValid) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_PAYMENT_SIGNATURE',
          message: 'Razorpay payment signature verification failed.',
        });
      }

      const subOrder = await findSubscriptionOrderByGatewayOrderId(db, gatewayOrderId);
      if (!subOrder || subOrder.studioId !== studioId) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'SUBSCRIPTION_ORDER_NOT_FOUND',
          message: 'Subscription order not found for this studio.',
        });
      }

      let updatedSub = await getStudioSubscription(db, studioId);
      if (subOrder.status !== 'PAID') {
        const capturedAt = new Date().toISOString();
        await updateSubscriptionOrderStatus(db, gatewayOrderId, 'PAID', {
          gatewayPaymentId,
          capturedAt,
        });
        updatedSub = await applySubscriptionRenewal(db, studioId, subOrder.plan, capturedAt);
      }

      return reply.send({
        success: true,
        status: 'PAID',
        subscription: updatedSub,
      });
    }
  );
};
