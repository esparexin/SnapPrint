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
import {
  canAuthorizePrint,
  canConfirmCustomerHandover,
  canTransitionOrderStatus,
} from '@snapprint/domain';
import { getDb } from './db.js';
import { operatorDocumentRoutes } from './order-document-routes.js';
import { requireStudioPermission } from './plugins/authorization.js';
import {
  findOrderById,
  listOrdersByStudio,
  updateOrderStatus,
} from './repositories/order.repository.js';
import { autoDispatchOrderPrintJobs } from './repositories/printer.repository.js';
import { findStudioById } from './repositories/studio.repository.js';
import { processOrderCancellationRefund } from './order-refund-helper.js';
import { PaymentGatewayService } from './payment/gateway-service.js';
import { StorageService } from './storage/storage-service.js';

export interface OperatorOrderRouteOptions {
  db?: Db;
  storage?: StorageService;
  gateway?: PaymentGatewayService;
}

export const operatorOrderRoutes: FastifyPluginAsync<OperatorOrderRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // Register document access and deletion sub-routes
  await app.register(operatorDocumentRoutes, opts);

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

      if (bodyResult.data.status === 'completed') {
        const handoverCheck = canConfirmCustomerHandover(
          existingOrder.status,
          bodyResult.data.confirmedHandover === true
        );
        if (!handoverCheck.allowed) {
          return reply.status(400).send({
            statusCode: 400,
            code: handoverCheck.error,
            message: handoverCheck.message,
          });
        }
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
        action: bodyResult.data.status === 'completed' ? 'handover_confirmed' : undefined,
      };

      if (bodyResult.data.status === 'cancelled') {
        const refundRes = await processOrderCancellationRefund(
          db,
          request.studioId!,
          request.params.orderId,
          bodyResult.data.notes,
          opts?.gateway
        );
        if (refundRes.refunded) {
          event.action = 'payment_refunded';
          event.reason = bodyResult.data.notes
            ? `${bodyResult.data.notes} | ${refundRes.reason}`
            : refundRes.reason;
        }
      }

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

      if (bodyResult.data.status === 'processing') {
        try {
          const dispatched = await autoDispatchOrderPrintJobs(
            db,
            request.studioId!,
            request.params.orderId
          );
          if (dispatched.length === 0) {
            request.log.warn(
              { studioId: request.studioId, orderId: request.params.orderId },
              'Auto-dispatch returned 0 print jobs during operator start-print transition'
            );
          }
        } catch (dispatchErr) {
          request.log.error(
            { err: dispatchErr, studioId: request.studioId, orderId: request.params.orderId },
            'Failed to auto-dispatch print jobs during operator start-print transition'
          );
        }
      }

      return reply.status(200).send(OrderRecordSchema.parse(updated));
    }
  );
};
