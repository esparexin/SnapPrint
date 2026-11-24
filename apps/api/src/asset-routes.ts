import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  PhotoAssetListResponseSchema,
  PhotoAssetSchema,
  UploadIntentResponseSchema,
  UploadLimits,
} from '@snapprint/contracts';
import { buildPrivateStorageKey } from '@snapprint/domain';
import {
  authenticateCustomerSession,
  validateUploadIntent,
  verifyStudioSessionOwnership,
} from './asset-auth.js';
import { inspectUploadedFile } from './asset-inspector.js';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import {
  createPhotoAssetRecord,
  deletePhotoAssetRecord,
  findPhotoAssetById,
  listPhotoAssetsBySession,
} from './repositories/photo-asset.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface AssetRouteOptions {
  db?: Db;
  config?: AppConfig;
  storage?: StorageService;
}

export const assetRoutes: FastifyPluginAsync<AssetRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // 1. Upload Intent Handshake
  app.post<{ Params: { slug: string; sessionId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/assets/intent',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;
      const db = getEffectiveDb();
      const studio = await verifyStudioSessionOwnership(
        db,
        request.params.slug,
        session.studioId,
        reply
      );
      if (!studio) return;

      const intent = await validateUploadIntent(
        db,
        studio.id,
        session.sessionId,
        request.body,
        reply
      );
      if (!intent) return;

      const assetId = randomUUID();
      const storageKey = buildPrivateStorageKey(
        studio.id,
        session.sessionId,
        assetId,
        intent.filename
      );

      const response = UploadIntentResponseSchema.parse({
        assetId,
        storageKey,
        uploadUrl: `/public/studios/${studio.slug}/sessions/${session.sessionId}/assets/upload?assetId=${assetId}`,
        expiresAt: session.expiresAt,
      });

      return reply.status(200).send(response);
    }
  );

  // 2. Upload Binary File (Multipart) with Authoritative Signature Verification
  app.post<{
    Params: { slug: string; sessionId: string };
    Querystring: { assetId?: string };
  }>('/public/studios/:slug/sessions/:sessionId/assets/upload', async (request, reply) => {
    const session = authenticateCustomerSession(request, reply, config.sessionSecret);
    if (!session) return;

    const db = getEffectiveDb();
    const studio = await verifyStudioSessionOwnership(
      db,
      request.params.slug,
      session.studioId,
      reply
    );
    if (!studio) return;

    const file = await request.file({ limits: { fileSize: UploadLimits.maxFileSize } });
    if (!file) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'MISSING_FILE',
        message: 'No file was provided in the multipart upload.',
      });
    }

    const buffer = await file.toBuffer();
    if (file.file.truncated) {
      return reply.status(400).send({
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum limit of ${UploadLimits.maxFileSize / (1024 * 1024)}MB.`,
      });
    }

    const inspection = inspectUploadedFile(buffer, file.mimetype);
    if (!inspection.ok) {
      return reply.status(inspection.statusCode).send({
        statusCode: inspection.statusCode,
        code: inspection.code,
        message: inspection.message,
      });
    }

    const assetId = request.query.assetId || randomUUID();
    const storageKey = buildPrivateStorageKey(studio.id, session.sessionId, assetId, file.filename);

    await getEffectiveStorage().put(storageKey, buffer, inspection.mimeType);

    const record = await createPhotoAssetRecord(db, {
      assetId,
      studioId: studio.id,
      sessionId: session.sessionId,
      originalFilename: file.filename,
      mimeType: inspection.mimeType,
      fileSizeBytes: buffer.length,
      widthPx: inspection.widthPx,
      heightPx: inspection.heightPx,
      pageCount: inspection.pageCount,
      storageKey,
      createdAt: new Date().toISOString(),
    });

    return reply.status(201).send(PhotoAssetSchema.parse(record));
  });

  // 3. List Assets in Session
  app.get<{ Params: { slug: string; sessionId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/assets',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;
      const db = getEffectiveDb();
      const assets = await listPhotoAssetsBySession(db, session.studioId, session.sessionId);
      return reply
        .status(200)
        .send(PhotoAssetListResponseSchema.parse({ assets, totalCount: assets.length }));
    }
  );

  // 4. Controlled Private File / Document Preview
  app.get<{
    Params: { slug: string; sessionId: string; assetId: string };
    Querystring: { token?: string };
  }>(
    '/public/studios/:slug/sessions/:sessionId/assets/:assetId/preview',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;
      const db = getEffectiveDb();
      const asset = await findPhotoAssetById(
        db,
        session.studioId,
        session.sessionId,
        request.params.assetId
      );
      if (!asset) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ASSET_NOT_FOUND',
          message: 'Document asset was not found in this session.',
        });
      }

      const item = await getEffectiveStorage().get(asset.storageKey);
      if (!item) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
          message: 'Asset binary was not found in private storage.',
        });
      }

      return reply
        .header('Content-Type', item.mimeType)
        .header('Cache-Control', 'private, max-age=300')
        .send(Buffer.from(item.data));
    }
  );

  // 5. Delete Asset
  app.delete<{ Params: { slug: string; sessionId: string; assetId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/assets/:assetId',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;
      const db = getEffectiveDb();
      const asset = await findPhotoAssetById(
        db,
        session.studioId,
        session.sessionId,
        request.params.assetId
      );
      if (!asset) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ASSET_NOT_FOUND',
          message: 'Document asset was not found in this session.',
        });
      }

      await getEffectiveStorage().delete(asset.storageKey);
      await deletePhotoAssetRecord(db, session.studioId, session.sessionId, asset.assetId);

      return reply.status(200).send({ success: true, assetId: asset.assetId });
    }
  );
};
