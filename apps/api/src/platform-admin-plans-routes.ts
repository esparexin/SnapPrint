import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  CreateSubscriptionPlanRequestSchema,
  SubscriptionNotificationRequestSchema,
  UpdateSubscriptionPlanRequestSchema,
} from '@snapprint/contracts';
import { getDb } from './db.js';
import { requirePlatformAdminAuth } from './plugins/authorization.js';
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  listSubscriptionPlans,
  updateSubscriptionPlan,
} from './repositories/platform-plans.repository.js';
import { AUDIT_LOGS_COLLECTION } from './repositories/platform-admin.repository.js';
import { randomUUID } from 'node:crypto';

export interface PlatformAdminPlansRoutesOptions {
  getCustomDb?: () => Db;
}

export const platformAdminPlansRoutes: FastifyPluginAsync<PlatformAdminPlansRoutesOptions> = async (
  fastify: FastifyInstance,
  options
) => {
  const getActiveDb = options.getCustomDb || getDb;
  const adminAuth = requirePlatformAdminAuth(getActiveDb);

  // 1. List All Configured Plans
  fastify.get('/admin/plans', { preHandler: [adminAuth] }, async (_request, reply) => {
    const db = getActiveDb();
    const plans = await listSubscriptionPlans(db);
    return reply.status(200).send({ plans });
  });

  // 2. Create New Plan Tier
  fastify.post('/admin/plans', { preHandler: [adminAuth] }, async (request, reply) => {
    const db = getActiveDb();
    const actorId = (request as unknown as { user?: { id?: string } }).user?.id || 'admin';
    const parsed = CreateSubscriptionPlanRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid plan creation payload.',
      });
    }

    try {
      const created = await createSubscriptionPlan(db, parsed.data, actorId);
      return reply.status(201).send({ plan: created });
    } catch (err) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'PLAN_EXISTS',
        message: err instanceof Error ? err.message : 'Plan creation failed.',
      });
    }
  });

  // 3. Update Existing Plan Tier
  fastify.put<{ Params: { planId: string } }>(
    '/admin/plans/:planId',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const actorId = (request as unknown as { user?: { id?: string } }).user?.id || 'admin';
      const parsed = UpdateSubscriptionPlanRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid plan update payload.',
        });
      }

      const updated = await updateSubscriptionPlan(db, request.params.planId, parsed.data, actorId);
      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PLAN_NOT_FOUND',
          message: `Plan with ID "${request.params.planId}" not found.`,
        });
      }
      return reply.status(200).send({ plan: updated });
    }
  );

  // 4. Delete / Retire Plan Tier
  fastify.delete<{ Params: { planId: string } }>(
    '/admin/plans/:planId',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const actorId = (request as unknown as { user?: { id?: string } }).user?.id || 'admin';
      const success = await deleteSubscriptionPlan(db, request.params.planId, actorId);
      if (!success) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'PLAN_NOT_FOUND',
          message: `Plan with ID "${request.params.planId}" not found.`,
        });
      }
      return reply.status(200).send({ success: true, deletedId: request.params.planId });
    }
  );

  // 5. Trigger Subscription Notification
  fastify.post<{ Params: { studioId: string } }>(
    '/admin/studios/:studioId/subscription/notify',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const actorId = (request as unknown as { user?: { id?: string } }).user?.id || 'admin';
      const parsed = SubscriptionNotificationRequestSchema.safeParse(request.body || {});
      const reqData = parsed.success ? parsed.data : { type: 'expiry_reminder' as const };

      // Record immutable compliance audit event
      await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
        id: `audit_${randomUUID()}`,
        timestamp: new Date(),
        actorId,
        action: 'subscription.notification_triggered',
        targetType: 'studio',
        targetId: request.params.studioId,
        metadata: {
          notificationType: reqData.type,
          message: reqData.message,
          queuedAt: new Date().toISOString(),
        },
      });

      return reply.status(200).send({
        success: true,
        queued: true,
        studioId: request.params.studioId,
        type: reqData.type,
        message: 'Subscription notification event queued successfully.',
      });
    }
  );
};
