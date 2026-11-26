import { randomBytes } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { Db } from 'mongodb';
import { OrderAuditEvent, OrderPrintRetryResponseSchema } from '@snapprint/contracts';
import { canAuthorizePrint } from '@snapprint/domain';
import { getDb } from './db.js';
import { requireStudioPermission } from './plugins/authorization.js';
import { findOrderById, updateOrderStatus } from './repositories/order.repository.js';
import { resetFailedPrintJobsForOrder } from './repositories/print-job.repository.js';
import { findStudioById } from './repositories/studio.repository.js';

export interface OperatorRetryRouteOptions {
  db?: Db;
}

export const operatorRetryRoutes: FastifyPluginAsync<OperatorRetryRouteOptions> = async (
  app,
  opts
) => {
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  app.post<{ Params: { studioId: string; orderId: string } }>(
    '/studios/:studioId/orders/:orderId/retry-print',
    { preHandler: [requireStudioPermission('manage_order_status', getEffectiveDb)] },
    async (request, reply) => {
      const db = getEffectiveDb();
      const studioId = request.studioId!;
      const { orderId } = request.params;

      const order = await findOrderById(db, studioId, orderId);
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          code: 'ORDER_NOT_FOUND',
          message: 'Order was not found.',
        });
      }

      if (order.status === 'completed' || order.status === 'cancelled') {
        return reply.status(400).send({
          statusCode: 400,
          code: 'INVALID_ORDER_STATE',
          message: `Cannot retry print jobs for an order in '${order.status}' state.`,
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
          message: 'Payment is required before retrying print jobs for this order.',
        });
      }

      const result = await resetFailedPrintJobsForOrder(db, studioId, orderId);

      const event: OrderAuditEvent = {
        eventId: `evt_${Date.now()}_${randomBytes(4).toString('hex')}`,
        fromStatus: order.status,
        toStatus: 'processing',
        operatorUserId: request.operator?.user.id,
        operatorName: request.operator?.user.name,
        timestamp: new Date().toISOString(),
        action: 'print_retry',
        reason: `Operator requested print retry. ${result.resetCount} job(s) queued.`,
      };

      await updateOrderStatus(db, studioId, orderId, 'processing', event);

      return reply.status(200).send(
        OrderPrintRetryResponseSchema.parse({
          success: true,
          orderId,
          resetCount: result.resetCount,
          message: `Successfully queued ${result.resetCount} print job(s) for printer dispatch.`,
        })
      );
    }
  );
};
