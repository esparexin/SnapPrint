import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { StudioIdSchema } from '@snapprint/contracts';

declare module 'fastify' {
  interface FastifyRequest {
    studioId?: string;
  }
}

export class MissingTenantError extends Error {
  constructor(
    message = 'Tenant identification required (x-studio-id header or studioId parameter)'
  ) {
    super(message);
    this.name = 'MissingTenantError';
  }
}

export class InvalidTenantError extends Error {
  constructor(message = 'Invalid studioId format') {
    super(message);
    this.name = 'InvalidTenantError';
  }
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const params = request.params as Record<string, string> | undefined;
  const rawId = (request.headers['x-studio-id'] as string) || params?.studioId;

  if (!rawId) {
    reply.status(400).send({
      statusCode: 400,
      code: 'MISSING_TENANT_ID',
      message: 'Tenant context required. Provide x-studio-id header or studioId route parameter.',
    });
    return;
  }

  const parseResult = StudioIdSchema.safeParse(rawId);
  if (!parseResult.success) {
    reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_TENANT_ID',
      message: 'Invalid studioId format. Must be lowercase alphanumeric, dashes, or underscores.',
    });
    return;
  }

  request.studioId = parseResult.data;
}

export const tenantPlugin: FastifyPluginAsync = async (app) => {
  if (!app.hasRequestDecorator('studioId')) {
    app.decorateRequest('studioId', undefined);
  }
};
