import { FastifyReply, FastifyRequest } from 'fastify';
import { Db } from 'mongodb';
import {
  OperatorSession,
  Permission,
  Studio,
  StudioIdSchema,
  User,
  UserMembership,
  UserRole,
} from '@snapprint/contracts';
import { canPerformAction, ROLE_PERMISSIONS } from '@snapprint/domain';
import { getOperatorTokenFromCookies, hashSessionToken } from '../auth-utils.js';
import { getDb } from '../db.js';
import {
  findUserMembershipForStudio,
  findUserMemberships,
} from '../repositories/membership.repository.js';
import { findActiveOperatorSession } from '../repositories/operator-session.repository.js';
import { findStudioById } from '../repositories/studio.repository.js';
import { findUserById } from '../repositories/user.repository.js';

export interface OperatorContext {
  user: User;
  session: OperatorSession;
  memberships: UserMembership[];
  currentMembership?: UserMembership;
  studioId?: string;
  role?: UserRole;
  permissions?: readonly Permission[];
  studio?: Studio;
}

declare module 'fastify' {
  interface FastifyRequest {
    operator?: OperatorContext;
    studioId?: string;
  }
}

export async function authenticateOperator(
  request: FastifyRequest,
  reply: FastifyReply,
  db: Db = getDb()
): Promise<boolean> {
  const rawToken = getOperatorTokenFromCookies(request.cookies);
  if (!rawToken) {
    reply.status(401).send({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. No session cookie provided.',
    });
    return false;
  }

  const sessionId = hashSessionToken(rawToken);
  const session = await findActiveOperatorSession(db, sessionId);
  if (!session) {
    reply.status(401).send({
      statusCode: 401,
      code: 'INVALID_SESSION',
      message: 'Session is invalid, expired, or has been revoked.',
    });
    return false;
  }

  const user = await findUserById(db, session.userId);
  if (!user || user.status !== 'active') {
    reply.status(401).send({
      statusCode: 401,
      code: 'USER_INACTIVE',
      message: 'Operator account is suspended or no longer active.',
    });
    return false;
  }

  const memberships = await findUserMemberships(db, user.id);
  request.operator = { user, session, memberships };
  return true;
}

export function requireOperatorAuth(
  getCustomDb?: () => Db
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getCustomDb ? getCustomDb() : getDb();
    await authenticateOperator(request, reply, db);
  };
}

export function requireStudioPermission(
  permission?: Permission,
  getCustomDb?: () => Db
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getCustomDb ? getCustomDb() : getDb();

    const authenticated = await authenticateOperator(request, reply, db);
    if (!authenticated || !request.operator) {
      return;
    }

    const params = request.params as Record<string, string> | undefined;
    const headerId = request.headers['x-studio-id'] as string | undefined;
    const paramId = params?.studioId;

    if (headerId && paramId && headerId !== paramId) {
      reply.status(400).send({
        statusCode: 400,
        code: 'TENANT_ID_CONFLICT',
        message: `Conflicting tenant identifiers: header x-studio-id '${headerId}' does not match route parameter studioId '${paramId}'`,
      });
      return;
    }

    const targetStudioId = paramId || headerId;
    if (!targetStudioId) {
      reply.status(400).send({
        statusCode: 400,
        code: 'MISSING_STUDIO_CONTEXT',
        message: 'Studio context required. Provide studioId route parameter or x-studio-id header.',
      });
      return;
    }

    const parseResult = StudioIdSchema.safeParse(targetStudioId);
    if (!parseResult.success) {
      reply.status(400).send({
        statusCode: 400,
        code: 'INVALID_STUDIO_ID',
        message: 'Invalid studioId format. Must be lowercase alphanumeric, dashes, or underscores.',
      });
      return;
    }

    const validStudioId = parseResult.data;
    const { user, memberships } = request.operator;

    let effectiveMembership = memberships.find((m) => m.studioId === validStudioId);
    if (!effectiveMembership) {
      const directMembership = await findUserMembershipForStudio(db, user.id, validStudioId);
      if (directMembership) {
        if (directMembership.status !== 'active') {
          reply.status(403).send({
            statusCode: 403,
            code: 'MEMBERSHIP_INACTIVE',
            message: `Studio membership is ${directMembership.status}. Access denied.`,
          });
          return;
        }
        effectiveMembership = directMembership;
      }
    }

    if (!effectiveMembership) {
      const platformAdmin = memberships.find((m) => m.role === 'platform_admin');
      if (platformAdmin) {
        effectiveMembership = platformAdmin;
      }
    }

    if (!effectiveMembership) {
      reply.status(403).send({
        statusCode: 403,
        code: 'UNAUTHORIZED_STUDIO_ACCESS',
        message: `Operator is not authorized to access studio '${validStudioId}'.`,
      });
      return;
    }

    const studio = await findStudioById(db, validStudioId);
    if (!studio) {
      reply.status(404).send({
        statusCode: 404,
        code: 'STUDIO_NOT_FOUND',
        message: `Studio '${validStudioId}' does not exist.`,
      });
      return;
    }

    if (studio.status === 'suspended') {
      reply.status(403).send({
        statusCode: 403,
        code: 'STUDIO_SUSPENDED',
        message: `Studio '${validStudioId}' is currently suspended.`,
      });
      return;
    }

    if (studio.status === 'closed') {
      reply.status(403).send({
        statusCode: 403,
        code: 'STUDIO_CLOSED',
        message: `Studio '${validStudioId}' is permanently closed.`,
      });
      return;
    }

    if (permission && !canPerformAction(effectiveMembership, permission, validStudioId)) {
      reply.status(403).send({
        statusCode: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Role '${effectiveMembership.role}' does not have permission '${permission}' on studio '${validStudioId}'.`,
      });
      return;
    }

    request.studioId = validStudioId;
    request.operator.studioId = validStudioId;
    request.operator.currentMembership = effectiveMembership;
    request.operator.role = effectiveMembership.role;
    request.operator.permissions = ROLE_PERMISSIONS[effectiveMembership.role];
    request.operator.studio = studio;
  };
}
