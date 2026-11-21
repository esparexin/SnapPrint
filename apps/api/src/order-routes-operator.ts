import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import {
  OrderListResponseSchema,
  OrderRecordSchema,
  OrderStatusUpdateRequestSchema,
} from '@snapprint/contracts';
import { canAuthorizePrint } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import {
  findOrderById,
  listOrdersByStudio,
  updateOrderStatus,
} from './repositories/order.repository.js';
import { findStudioById } from './repositories/studio.repository.js';

export interface OperatorOrderRouteOptions {
  db?: Db;
}

export const operatorOrderRoutes: FastifyPluginAsync<OperatorOrderRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // Operator Operational Queue: List Orders
  app.get<{ Params: { studioId: string } }>(
    '/studios/:studioId/orders',
    { preHandler: [requireStudioPermission('view_orders', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const orders = await listOrdersByStudio(db, request.studioId!);
      return reply
        .status(200)
        .send(OrderListResponseSchema.parse({ orders, totalCount: orders.length }));
    }
  );

  // Operator Operational Queue: Update Order Status
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

      if (bodyResult.data.status === 'processing') {
        const existingOrder = await findOrderById(db, request.studioId!, request.params.orderId);
        if (!existingOrder) {
          return reply.status(404).send({
            statusCode: 404,
            code: 'ORDER_NOT_FOUND',
            message: 'Order was not found.',
          });
        }

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

      const updated = await updateOrderStatus(
        db,
        request.studioId!,
        request.params.orderId,
        bodyResult.data.status
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
};
