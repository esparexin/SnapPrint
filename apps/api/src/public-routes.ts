import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  CustomerSessionResponseSchema,
  PublicStudioSchema,
  StudioSchema,
} from '@snapprint/contracts';
import { calculateSessionExpiry } from '@snapprint/domain';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { createSessionRecord } from './repositories/session.repository.js';
import { findStudioBySlug } from './repositories/studio.repository.js';
import { signSessionToken } from './session-token.js';

export interface PublicRouteOptions {
  db?: Db;
  config?: AppConfig;
}

export const publicRoutes: FastifyPluginAsync<PublicRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  /**
   * Resolves safe public studio information by its permanent slug.
   */
  app.get<{ Params: { slug: string } }>('/public/studios/:slug', async (request, reply) => {
    const slugResult = StudioSchema.shape.slug.safeParse(request.params.slug);
    if (!slugResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'INVALID_STUDIO_SLUG',
        message: 'Studio slug must consist of lowercase alphanumeric characters and dashes.',
      });
    }

    const db = getEffectiveDb();
    const studio = await findStudioBySlug(db, slugResult.data);
    if (!studio) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'STUDIO_NOT_FOUND',
        message: `Studio '${slugResult.data}' was not found.`,
      });
    }

    const publicStudio = PublicStudioSchema.parse({
      id: studio.id,
      slug: studio.slug,
      name: studio.name,
      status: studio.status,
      currency: studio.settings.currency,
      contactPhone: studio.settings.contactPhone,
      contactEmail: studio.settings.contactEmail,
    });

    return reply.status(200).send(publicStudio);
  });

  /**
   * Initializes a temporary, short-lived customer QR session for an active studio.
   */
  app.post<{ Params: { slug: string } }>(
    '/public/studios/:slug/sessions',
    async (request, reply) => {
      const slugResult = StudioSchema.shape.slug.safeParse(request.params.slug);
      if (!slugResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_STUDIO_SLUG',
          message: 'Studio slug must consist of lowercase alphanumeric characters and dashes.',
        });
      }

      const db = getEffectiveDb();
      const studio = await findStudioBySlug(db, slugResult.data);
      if (!studio) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'STUDIO_NOT_FOUND',
          message: `Studio '${slugResult.data}' was not found.`,
        });
      }

      // Fail-closed availability check
      if (studio.status !== 'active') {
        return reply.status(403).send({
          statusCode: 403,
          code: 'STUDIO_NOT_ACTIVE',
          message: `Studio '${studio.name}' is currently ${studio.status} and cannot accept customer sessions.`,
        });
      }

      const now = new Date();
      const expiresAt = calculateSessionExpiry(now, 120);
      const sessionId = randomUUID();

      const session = await createSessionRecord(db, {
        sessionId,
        studioId: studio.id,
        status: 'active',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      const token = signSessionToken(
        {
          sessionId: session.sessionId,
          studioId: session.studioId,
          expiresAt: session.expiresAt,
        },
        config.sessionSecret
      );

      const responsePayload = CustomerSessionResponseSchema.parse({
        session,
        token,
      });

      return reply.status(201).send(responsePayload);
    }
  );
};
