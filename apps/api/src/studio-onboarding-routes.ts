import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { CreateShopRequestSchema, ShopActivationRequestSchema } from '@snapprint/contracts';
import { canActivateShop, canTransitionShopStatus, validateSlugSanity } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireOperatorAuth, requireStudioPermission } from './plugins/authorization.js';
import {
  activateStudio,
  createStudioWithOnboarding,
  findStudioDocumentById,
  findStudiosByOwnerUserId,
} from './repositories/studio-onboarding.repository.js';
import { findStudioBySlug } from './repositories/studio.repository.js';

export interface StudioOnboardingRouteOptions {
  db?: Db;
}

export const studioOnboardingRoutes: FastifyPluginAsync<StudioOnboardingRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // POST /studios - Register a new shop in onboarding status
  app.post(
    '/studios',
    { preHandler: [requireOperatorAuth(getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const operator = request.operator!;
      const parsed = CreateShopRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join(', '),
        });
      }

      const input = parsed.data;
      const slugCheck = validateSlugSanity(input.slug);
      if (!slugCheck.valid) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_SLUG',
          message: slugCheck.reason,
        });
      }

      const existing = await findStudioBySlug(db, input.slug);
      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          code: 'SLUG_ALREADY_EXISTS',
          message: `Studio slug '${input.slug}' is already in use. Please select a different slug.`,
        });
      }

      const studio = await createStudioWithOnboarding(db, input, operator.user.id);
      return reply.status(201).send(studio);
    }
  );

  // GET /studios/me - Retrieve shops owned by the authenticated operator with readiness status
  app.get(
    '/studios/me',
    { preHandler: [requireOperatorAuth(getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const operator = request.operator!;
      const studios = await findStudiosByOwnerUserId(db, operator.user.id);

      const items = studios.map((s) => ({
        ...s,
        readiness: canActivateShop({
          name: s.name,
          slug: s.slug,
          city: s.location?.city,
        }),
      }));

      return reply.status(200).send({ studios: items });
    }
  );

  // POST /studios/:studioId/activate - Transition shop from onboarding to active
  app.post(
    '/studios/:studioId/activate',
    { preHandler: [requireStudioPermission('manage_studio', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const { studioId } = request.params as { studioId: string };
      const parsed = ShopActivationRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'You must confirm operational readiness to activate the shop.',
        });
      }

      const studio = await findStudioDocumentById(db, studioId);
      if (!studio) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: 'Studio not found.',
        });
      }

      const readiness = canActivateShop({
        name: studio.name,
        slug: studio.slug,
        city: studio.location?.city,
      });

      if (!readiness.canActivate) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'STUDIO_NOT_READY',
          message: 'Shop does not meet minimum activation requirements.',
          errors: readiness.errors,
        });
      }

      if (!canTransitionShopStatus(studio.status, 'active')) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition studio from '${studio.status}' to 'active'.`,
        });
      }

      await activateStudio(db, studioId);
      const now = new Date().toISOString();

      return reply.status(200).send({
        studioId,
        status: 'active',
        activatedAt: now,
        publicUrl: `/s/${studio.slug}`,
      });
    }
  );
};
