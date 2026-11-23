import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  InviteStaffRequestSchema,
  InviteStaffResponseSchema,
  RevokeStaffResponseSchema,
  StudioMetricsResponseSchema,
  UpdateStudioProfileRequestSchema,
  UserIdSchema,
  UserRoleSchema,
  z,
} from '@snapprint/contracts';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { getTodayStudioMetrics } from './repositories/studio-metrics.repository.js';
import {
  inviteStudioStaff,
  listStudioStaff,
  revokeStudioStaff,
} from './repositories/studio-staff.repository.js';
import {
  createUserMembership,
} from './repositories/membership.repository.js';
import { updateStudioProfile } from './repositories/studio.repository.js';

export interface StudioWorkspaceRouteOptions {
  db?: Db;
}

const AddStaffDirectSchema = z.object({
  userId: UserIdSchema,
  role: UserRoleSchema.refine((r) => r !== 'platform_admin', {
    message: 'Cannot assign platform_admin role via studio staff management',
  }),
});

export const studioWorkspaceRoutes: FastifyPluginAsync<StudioWorkspaceRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // GET /studios/:studioId/metrics - Authoritative operational summary for today
  app.get(
    '/studios/:studioId/metrics',
    { preHandler: [requireStudioPermission('view_analytics', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const metrics = await getTodayStudioMetrics(db, studioId);
      return reply.status(200).send(StudioMetricsResponseSchema.parse(metrics));
    }
  );

  // GET /studios/:studioId/staff - List staff roster for studio
  app.get(
    '/studios/:studioId/staff',
    { preHandler: [requireStudioPermission('manage_staff', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const staff = await listStudioStaff(db, studioId);
      return reply.status(200).send(staff);
    }
  );

  // POST /studios/:studioId/staff - Add staff directly by userId (internal/admin)
  app.post(
    '/studios/:studioId/staff',
    { preHandler: [requireStudioPermission('manage_staff', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const parseResult = AddStaffDirectSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid staff input payload',
          issues: parseResult.error.issues,
        });
      }

      const membership = await createUserMembership(db, {
        userId: parseResult.data.userId,
        studioId,
        role: parseResult.data.role,
        status: 'active',
      });

      return reply.status(201).send(membership);
    }
  );

  // POST /studios/:studioId/staff/invite - Invite staff member by email
  app.post(
    '/studios/:studioId/staff/invite',
    { preHandler: [requireStudioPermission('manage_staff', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const parseResult = InviteStaffRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid staff invitation payload',
          errors: parseResult.error.flatten(),
        });
      }

      const invited = await inviteStudioStaff(db, {
        studioId,
        email: parseResult.data.email,
        name: parseResult.data.name,
        invitedByUserId: request.operator?.user.id,
      });

      return reply.status(201).send(
        InviteStaffResponseSchema.parse({
          success: true,
          staff: invited,
        })
      );
    }
  );

  // DELETE /studios/:studioId/staff/:staffId - Revoke staff access immediately
  app.delete(
    '/studios/:studioId/staff/:staffId',
    { preHandler: [requireStudioPermission('manage_staff', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId, staffId } = request.params as { studioId: string; staffId: string };

      const revoked = await revokeStudioStaff(db, studioId, staffId);
      if (!revoked) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STAFF_NOT_FOUND',
          message: `Staff member "${staffId}" was not found or already revoked.`,
        });
      }

      return reply.status(200).send(
        RevokeStaffResponseSchema.parse({
          success: true,
          membershipId: staffId,
          status: 'revoked',
        })
      );
    }
  );

  // PATCH /studios/:studioId/profile - Update public details and pause/resume intake
  app.patch(
    '/studios/:studioId/profile',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };

      const parseResult = UpdateStudioProfileRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid studio profile payload',
          errors: parseResult.error.flatten(),
        });
      }

      const fields = parseResult.data;
      const updated = await updateStudioProfile(db, studioId, {
        tagline: fields.tagline,
        contactPhone: fields.contactPhone,
        address: fields.address,
        isAcceptingOrders: fields.isAcceptingOrders,
      });

      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: `Studio "${studioId}" was not found.`,
        });
      }

      return reply.status(200).send({ studio: updated });
    }
  );
};
