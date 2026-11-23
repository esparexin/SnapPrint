import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { StudioSettingsSchema } from '@snapprint/contracts';
import { getDb } from './db.js';
import { requireOperatorAuth, requireStudioPermission } from './plugins/authorization.js';
import { findStudiosByIds, updateStudioSettings } from './repositories/studio.repository.js';

export interface StudioRouteOptions {
  db?: Db;
}

const UpdateSettingsSchema = StudioSettingsSchema.partial();

export const studioRoutes: FastifyPluginAsync<StudioRouteOptions> = async (app, opts) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // GET /operator/studios - List studios accessible to the authenticated operator
  app.get(
    '/operator/studios',
    { preHandler: [requireOperatorAuth(getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const operator = request.operator!;

      const studioIds = operator.memberships
        .map((m) => m.studioId)
        .filter((id): id is string => Boolean(id));

      const studios = await findStudiosByIds(db, studioIds);

      const result = studios.map((studio) => {
        const membership = operator.memberships.find((m) => m.studioId === studio.id);
        return {
          studio,
          role: membership?.role,
          status: membership?.status,
        };
      });

      return reply.status(200).send(result);
    }
  );

  // GET /studios/:studioId - Retrieve studio details (scoped to authorized tenant)
  app.get(
    '/studios/:studioId',
    { preHandler: [requireStudioPermission('view_orders', getEffectiveDb)] },
    async (request, reply) => {
      const operator = request.operator!;
      return reply.status(200).send({
        studio: operator.studio,
        role: operator.role,
        permissions: operator.permissions,
      });
    }
  );

  // PATCH /studios/:studioId/settings - Update studio settings (manage_studio required)
  app.patch(
    '/studios/:studioId/settings',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const parseResult = UpdateSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid studio settings payload',
          issues: parseResult.error.issues,
        });
        return;
      }

      const updated = await updateStudioSettings(db, request.studioId!, parseResult.data);
      return reply.status(200).send(updated);
    }
  );
};
