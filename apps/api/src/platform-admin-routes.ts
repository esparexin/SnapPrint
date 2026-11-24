import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  AdminOverrideSubscriptionRequestSchema,
  CreatePlatformAdminUserRequestSchema,
  ListPlatformStudiosQuerySchema,
  StudioIdSchema,
  UpdatePlatformStudioStatusRequestSchema,
  UpdatePlatformUserStatusRequestSchema,
} from '@snapprint/contracts';
import { getDb } from './db.js';
import { requirePlatformAdminAuth } from './plugins/authorization.js';
import {
  createPlatformAdminUser,
  getPlatformMetrics,
  getPlatformStudioDetails,
  listPlatformAuditLogs,
  listPlatformStudios,
  listPlatformUsers,
  updatePlatformUserStatus,
  updateStudioStatusWithAudit,
} from './repositories/platform-admin.repository.js';
import { overridePlatformStudioSubscription } from './repositories/platform-subscription-override.repository.js';

export interface PlatformAdminRoutesOptions {
  getCustomDb?: () => Db;
}

export const platformAdminRoutes: FastifyPluginAsync<PlatformAdminRoutesOptions> = async (
  fastify: FastifyInstance,
  options
) => {
  const getActiveDb = options.getCustomDb || getDb;
  const adminAuth = requirePlatformAdminAuth(getActiveDb);

  fastify.get('/admin/metrics', { preHandler: [adminAuth] }, async (_request, reply) => {
    const db = getActiveDb();
    const metrics = await getPlatformMetrics(db);
    return reply.status(200).send(metrics);
  });

  fastify.get('/admin/studios', { preHandler: [adminAuth] }, async (request, reply) => {
    const db = getActiveDb();
    const query = ListPlatformStudiosQuerySchema.parse(request.query);
    const result = await listPlatformStudios(db, query);
    return reply.status(200).send(result);
  });

  fastify.patch(
    '/admin/studios/:studioId/status',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const params = request.params as { studioId: string };
      const studioIdResult = StudioIdSchema.safeParse(params.studioId);
      if (!studioIdResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_STUDIO_ID',
          message: 'Invalid studioId format.',
        });
      }

      const body = UpdatePlatformStudioStatusRequestSchema.parse(request.body);
      const actorId = request.operator?.user.id || 'system';

      const updated = await updateStudioStatusWithAudit(
        db,
        studioIdResult.data,
        body.status,
        actorId,
        body.reason
      );

      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: `Studio '${studioIdResult.data}' was not found.`,
        });
      }

      return reply.status(200).send({
        studio: updated,
      });
    }
  );

  fastify.get('/admin/audit-logs', { preHandler: [adminAuth] }, async (request, reply) => {
    const db = getActiveDb();
    const query = request.query as { limit?: string };
    const limit = query?.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 50;
    const result = await listPlatformAuditLogs(db, limit);
    return reply.status(200).send(result);
  });

  fastify.get('/admin/users', { preHandler: [adminAuth] }, async (request, reply) => {
    const db = getActiveDb();
    const query = request.query as { limit?: string };
    const limit = query?.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 50;
    const result = await listPlatformUsers(db, limit);
    return reply.status(200).send(result);
  });

  fastify.post('/admin/users', { preHandler: [adminAuth] }, async (request, reply) => {
    const db = getActiveDb();
    const body = CreatePlatformAdminUserRequestSchema.parse(request.body);
    const actorId = request.operator?.user.id || 'system';
    const user = await createPlatformAdminUser(db, body, actorId);
    return reply.status(201).send({ success: true, user });
  });

  fastify.patch(
    '/admin/users/:userId/status',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const params = request.params as { userId: string };
      const body = UpdatePlatformUserStatusRequestSchema.parse(request.body);
      const actorId = request.operator?.user.id || 'system';

      try {
        const result = await updatePlatformUserStatus(db, params.userId, body.status, actorId);
        return reply.status(200).send(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isSelf = msg.includes('SELF_SUSPENSION_PREVENTED');
        return reply.status(isSelf ? 400 : 404).send({
          statusCode: isSelf ? 400 : 404,
          code: isSelf ? 'SELF_SUSPENSION_PREVENTED' : 'USER_NOT_FOUND',
          message: msg,
        });
      }
    }
  );

  fastify.get(
    '/admin/studios/:studioId/details',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const params = request.params as { studioId: string };
      const studioIdResult = StudioIdSchema.safeParse(params.studioId);
      if (!studioIdResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_STUDIO_ID',
          message: 'Invalid studioId format.',
        });
      }

      const details = await getPlatformStudioDetails(db, studioIdResult.data);
      if (!details) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: `Studio '${studioIdResult.data}' was not found.`,
        });
      }

      return reply.status(200).send(details);
    }
  );

  fastify.post(
    '/admin/studios/:studioId/subscription',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const db = getActiveDb();
      const params = request.params as { studioId: string };
      const studioIdResult = StudioIdSchema.safeParse(params.studioId);
      if (!studioIdResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_STUDIO_ID',
          message: 'Invalid studioId format.',
        });
      }

      const body = AdminOverrideSubscriptionRequestSchema.parse(request.body);
      const actorId = request.operator?.user.id || 'system';
      const updated = await overridePlatformStudioSubscription(
        db,
        studioIdResult.data,
        body,
        actorId
      );

      return reply.status(200).send({
        success: true,
        subscription: updated,
      });
    }
  );
};
