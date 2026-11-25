import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { DocumentDeletionResponseSchema, OrderAuditEvent } from '@snapprint/contracts';
import { canAuthorizePrint, canDeleteOrderDocument } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { findOrderById, markOrderDocumentDeleted } from './repositories/order.repository.js';
import { findPhotoAssetById } from './repositories/photo-asset.repository.js';
import { findStudioById } from './repositories/studio.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface OperatorDocumentRouteOptions {
  db?: Db;
  storage?: StorageService;
}

export const operatorDocumentRoutes: FastifyPluginAsync<OperatorDocumentRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // Operator Document Access: Secure Authorized Stream for Physical Printing
  app.get<{ Params: { studioId: string; orderId: string; assetId: string } }>(
    '/studios/:studioId/orders/:orderId/documents/:assetId/download',
    { preHandler: [requireStudioPermission('view_orders', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.studioId!;
      const { orderId, assetId } = request.params;

      const order = await findOrderById(db, studioId, orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      const orderItem = order.items.find((item) => item.assetId === assetId);
      if (!orderItem) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ASSET_NOT_FOUND',
          message: 'Document asset does not belong to this order.',
        });
      }

      if (orderItem.isDeleted) {
        return reply.status(410).send({
          statusCode: 410,
          code: 'DOCUMENT_DELETED',
          message: 'Preview unavailable — document deleted',
        });
      }

      const studio = await findStudioById(db, studioId);
      const paymentPolicy = studio?.settings.paymentPolicy ?? 'payment_required';
      const hasOverride =
        request.operator?.role === 'studio_owner' || request.operator?.role === 'platform_admin';
      const authResult = canAuthorizePrint({
        orderPaymentStatus: order.paymentStatus ?? 'UNPAID',
        paymentPolicy,
        hasOverridePermission: hasOverride,
      });

      if (!authResult.allowed) {
        return reply.status(403).send({
          statusCode: 403,
          code: authResult.reason,
          message: 'Payment is required before downloading order documents.',
        });
      }

      const asset = await findPhotoAssetById(db, studioId, order.sessionId, assetId);
      if (!asset) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ASSET_NOT_FOUND',
          message: 'Document asset record was not found.',
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

      const safeFilename = (asset.originalFilename || 'document.pdf').replace(/["\r\n\\]/g, '_');
      return reply
        .header('Content-Type', item.mimeType)
        .header('Cache-Control', 'private, no-store')
        .header('Content-Disposition', `inline; filename="${safeFilename}"`)
        .send(Buffer.from(item.data));
    }
  );

  // Operator Document Deletion: Gated strictly to completed orders post-handover
  app.delete<{ Params: { studioId: string; orderId: string; assetId: string } }>(
    '/studios/:studioId/orders/:orderId/documents/:assetId',
    { preHandler: [requireStudioPermission('manage_order_status', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.studioId!;
      const { orderId, assetId } = request.params;

      const order = await findOrderById(db, studioId, orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      const orderItem = order.items.find((item) => item.assetId === assetId);
      if (!orderItem) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ASSET_NOT_FOUND',
          message: 'Document asset does not belong to this order.',
        });
      }

      const deletionCheck = canDeleteOrderDocument(order.status, orderItem.isDeleted);
      if (!deletionCheck.allowed) {
        return reply.status(400).send({
          statusCode: 400,
          code: deletionCheck.error,
          message: deletionCheck.message,
        });
      }

      const asset = await findPhotoAssetById(db, studioId, order.sessionId, assetId);
      if (asset) {
        await getEffectiveStorage().delete(asset.storageKey);
      }

      const nowIso = new Date().toISOString();
      const event: OrderAuditEvent = {
        eventId: `evt_${Date.now()}_${randomBytes(4).toString('hex')}`,
        fromStatus: order.status,
        toStatus: order.status,
        operatorUserId: request.operator?.user.id,
        operatorName: request.operator?.user.name,
        timestamp: nowIso,
        action: 'document_purged',
        assetId,
        reason: 'Customer privacy document purge after verified handover',
      };

      const updated = await markOrderDocumentDeleted(db, studioId, orderId, assetId, event);
      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      return reply.status(200).send(
        DocumentDeletionResponseSchema.parse({
          success: true,
          orderId,
          assetId,
          deletedAt: nowIso,
        })
      );
    }
  );
};
