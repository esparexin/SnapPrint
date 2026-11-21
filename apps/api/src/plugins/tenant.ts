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

export class TenantConflictError extends Error {
  constructor(headerId: string, paramId: string) {
    super(
      `Conflicting tenant identifiers: header x-studio-id '${headerId}' does not match route parameter studioId '${paramId}'`
    );
    this.name = 'TenantConflictError';
  }
}

export async function requireTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const params = request.params as Record<string, string> | undefined;
  const headerId = request.headers['x-studio-id'] as string | undefined;
  const paramId = params?.studioId;

  // Protect against header and route parameter hijacking/conflict
  if (headerId && paramId && headerId !== paramId) {
    reply.status(400).send({
      statusCode: 400,
      code: 'TENANT_ID_CONFLICT',
      message: `Conflicting tenant identifiers provided: header x-studio-id '${headerId}' does not match route parameter studioId '${paramId}'.`,
    });
    return;
  }

  const rawId = headerId || paramId;

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
