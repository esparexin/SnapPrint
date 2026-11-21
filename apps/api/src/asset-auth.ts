import { FastifyReply, FastifyRequest } from 'fastify';
import { Db } from 'mongodb';
import { Studio, UploadIntentRequest, UploadIntentRequestSchema } from '@snapprint/contracts';
import { validateUploadRequest } from '@snapprint/domain';
import { countPhotoAssetsBySession } from './repositories/photo-asset.repository.js';
import { findStudioBySlug } from './repositories/studio.repository.js';
import { SessionTokenPayload, verifySessionToken } from './session-token.js';

export function authenticateCustomerSession(
  request: FastifyRequest<{ Params: { slug: string; sessionId: string } }>,
  reply: FastifyReply,
  sessionSecret: string
): SessionTokenPayload | null {
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
      message: 'Customer session token required via Authorization: Bearer <token>.',
    });
    return null;
  }

  try {
    const payload = verifySessionToken(token, sessionSecret);
    if (payload.sessionId !== request.params.sessionId) {
      reply.status(403).send({
        statusCode: 403,
        code: 'SESSION_MISMATCH',
        message: 'Session token does not match the requested route session.',
      });
      return null;
    }
    return payload;
  } catch (err) {
    reply.status(401).send({
      statusCode: 401,
      code: 'INVALID_SESSION_TOKEN',
      message: err instanceof Error ? err.message : 'Invalid session token.',
    });
    return null;
  }
}

export async function verifyStudioSessionOwnership(
  db: Db,
  slug: string,
  sessionStudioId: string,
  reply: FastifyReply
): Promise<Studio | null> {
  const studio = await findStudioBySlug(db, slug);
  if (!studio || studio.id !== sessionStudioId) {
    reply.status(403).send({
      statusCode: 403,
      code: 'TENANT_MISMATCH',
      message: 'Session is not authorized for this studio.',
    });
    return null;
  }
  return studio;
}

export async function validateUploadIntent(
  db: Db,
  studioId: string,
  sessionId: string,
  body: unknown,
  reply: FastifyReply
): Promise<UploadIntentRequest | null> {
  const count = await countPhotoAssetsBySession(db, studioId, sessionId);
  const bodyResult = UploadIntentRequestSchema.safeParse(body);
  if (!bodyResult.success) {
    reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_UPLOAD_INTENT',
      message: 'Invalid upload intent parameters.',
    });
    return null;
  }

  const policy = validateUploadRequest({
    mimeType: bodyResult.data.mimeType,
    fileSizeBytes: bodyResult.data.fileSizeBytes,
    currentSessionFilesCount: count,
  });

  if (!policy.ok) {
    reply.status(400).send({
      statusCode: 400,
      code: 'UPLOAD_POLICY_VIOLATION',
      message: policy.error,
    });
    return null;
  }

  return bodyResult.data;
}
