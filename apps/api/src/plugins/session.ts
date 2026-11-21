import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { assertTenantOwnership } from '@snapprint/domain';
import { SessionTokenPayload, verifySessionToken } from '../session-token.js';

declare module 'fastify' {
  interface FastifyRequest {
    customerSession?: SessionTokenPayload;
  }
}

export interface SessionPluginOptions {
  sessionSecret: string;
}

export function createRequireCustomerSession(sessionSecret: string) {
  return async function requireCustomerSession(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (typeof request.headers['x-session-token'] === 'string') {
      token = request.headers['x-session-token'].trim();
    }

    if (!token) {
      reply.status(401).send({
        statusCode: 401,
        code: 'MISSING_SESSION_TOKEN',
        message:
          'Customer session token required. Provide Authorization: Bearer <token> or x-session-token header.',
      });
      return;
    }

    // verifySessionToken verifies signature and asserts session is not expired
    const session = verifySessionToken(token, sessionSecret);

    // If tenant context was already established on this request, enforce cross-tenant boundary
    if (request.studioId) {
      assertTenantOwnership(request.studioId, session.studioId);
    }

    request.customerSession = session;
  };
}

export const sessionPlugin: FastifyPluginAsync<SessionPluginOptions> = async (app) => {
  if (!app.hasRequestDecorator('customerSession')) {
    app.decorateRequest('customerSession', undefined);
  }
};
