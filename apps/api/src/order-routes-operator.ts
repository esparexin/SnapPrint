import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  OrderAuditEvent,
  OrderListResponseSchema,
  OrderRecordSchema,
  OrderStatus,
  OrderStatusUpdateRequestSchema,
} from '@snapprint/contracts';
import { canAuthorizePrint, canTransitionOrderStatus } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import {
  findOrderById,
  listOrdersByStudio,
  updateOrderStatus,
} from './repositories/order.repository.js';
import { findPhotoAssetById } from './repositories/photo-asset.repository.js';
import { findStudioById } from './repositories/studio.repository.js';
import { getStorageService, StorageService } from './storage/storage-service.js';

export interface OperatorOrderRouteOptions {
  db?: Db;
  storage?: StorageService;
}

export const operatorOrderRoutes: FastifyPluginAsync<OperatorOrderRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();
  const getEffectiveStorage = (): StorageService => opts?.storage ?? getStorageService();

  // Operator Operational Queue: List Orders
  app.get<{ Params: { studioId: string }; Querystring: { status?: OrderStatus } }>(
    '/studios/:studioId/orders',
    { preHandler: [requireStudioPermission('view_orders', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const orders = await listOrdersByStudio(db, request.studioId!, {
        status: request.query.status,
      });
      return reply
        .status(200)
        .send(OrderListResponseSchema.parse({ orders, totalCount: orders.length }));
    }
  );

  // Operator Operational Queue: Update Order Status with State Machine & Audit Trail
  app.patch<{ Params: { studioId: string; orderId: string } }>(
    '/studios/:studioId/orders/:orderId/status',
    { preHandler: [requireStudioPermission('manage_order_status', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const bodyResult = OrderStatusUpdateRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update payload.',
        });
      }

      const existingOrder = await findOrderById(db, request.studioId!, request.params.orderId);
      if (!existingOrder) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      const transition = canTransitionOrderStatus(existingOrder.status, bodyResult.data.status);
      if (!transition.allowed) {
        return reply.status(400).send({
          statusCode: 400,
          code: transition.error,
          message: transition.message,
        });
      }

      if (bodyResult.data.status === 'processing') {
        const studio = await findStudioById(db, request.studioId!);
        const paymentPolicy = studio?.settings.paymentPolicy ?? 'payment_required';
        const hasOverride =
          request.operator?.role === 'studio_owner' || request.operator?.role === 'platform_admin';
        const authResult = canAuthorizePrint({
          orderPaymentStatus: existingOrder.paymentStatus ?? 'UNPAID',
          paymentPolicy,
          hasOverridePermission: hasOverride,
        });

        if (!authResult.allowed) {
          return reply.status(403).send({
            statusCode: 403,
            code: authResult.reason,
            message: 'Payment is required before printing this order.',
          });
        }
      }

      const event: OrderAuditEvent = {
        eventId: `evt_${Date.now()}_${randomBytes(4).toString('hex')}`,
        fromStatus: existingOrder.status,
        toStatus: bodyResult.data.status,
        operatorUserId: request.operator?.user.id,
        operatorName: request.operator?.user.name,
        timestamp: new Date().toISOString(),
        reason: bodyResult.data.notes,
      };

      const updated = await updateOrderStatus(
        db,
        request.studioId!,
        request.params.orderId,
        bodyResult.data.status,
        event
      );
      if (!updated) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      return reply.status(200).send(OrderRecordSchema.parse(updated));
    }
  );

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
};
