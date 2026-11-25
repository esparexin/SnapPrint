import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { Db } from 'mongodb';
import {
  OrderRecordSchema,
  OrderSubmissionRequestSchema,
  QuoteRequestSchema,
  QuoteResponseSchema,
} from '@snapprint/contracts';
import { calculateOrderQuote, PricingMatrix } from '@snapprint/domain';
import { authenticateCustomerSession, verifyStudioSessionOwnership } from './asset-auth.js';
import { AppConfig, loadConfig } from './config.js';
import { getDb } from './db.js';
import { operatorOrderRoutes } from './order-routes-operator.js';
import {
  createOrderRecord,
  findOrderBySessionAndId,
  findOrderByStudioAndIdempotency,
} from './repositories/order.repository.js';
import { checkStudioCheckoutAvailability } from './repositories/subscription.repository.js';
import { prepareOrderAdmission } from './repositories/printer-allowance.repository.js';
import { StorageService } from './storage/storage-service.js';

export interface OrderRouteOptions {
  db?: Db;
  config?: AppConfig;
  storage?: StorageService;
}

const sendError = (reply: FastifyReply, status: number, code: string, message: string) =>
  reply.status(status).send({ statusCode: status, code, message });

export const orderRoutes: FastifyPluginAsync<OrderRouteOptions> = async (app, opts) => {
  const config = opts?.config ?? loadConfig();
  const getEffectiveDb = (): Db => opts?.db ?? getDb();

  // Register operator queue routes
  await app.register(operatorOrderRoutes, { db: opts?.db, storage: opts?.storage });

  // 1. Calculate Authoritative Quote
  app.post<{ Params: { slug: string; sessionId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/quote',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;

      const db = getEffectiveDb();
      const { slug } = request.params;
      const studio = await verifyStudioSessionOwnership(db, slug, session.studioId, reply);
      if (!studio) return;

      const bodyResult = QuoteRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid payload.');
      }

      const admission = await prepareOrderAdmission(
        db,
        studio.id,
        session.sessionId,
        bodyResult.data.items
      );
      if (admission.error) {
        return sendError(
          reply,
          admission.error.status,
          admission.error.code,
          admission.error.message
        );
      }
      const itemsWithMeta = admission.items!;

      try {
        const quote = calculateOrderQuote({
          items: itemsWithMeta,
          rates: studio.settings.printRates as PricingMatrix | undefined,
        });
        return reply.status(200).send(QuoteResponseSchema.parse(quote));
      } catch (err) {
        return sendError(
          reply,
          400,
          'PRICING_CALCULATION_ERROR',
          err instanceof Error ? err.message : 'Failed to calculate quotation.'
        );
      }
    }
  );

  // 2. Submit Document Print Order (Idempotent)
  app.post<{ Params: { slug: string; sessionId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/orders',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;

      const db = getEffectiveDb();
      const { slug } = request.params;
      const studio = await verifyStudioSessionOwnership(db, slug, session.studioId, reply);
      if (!studio) return;

      const avail = await checkStudioCheckoutAvailability(db, studio);
      if (!avail.allowed) {
        return sendError(reply, 403, avail.reason, avail.reason);
      }

      const bodyResult = OrderSubmissionRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid payload.');
      }

      const existing = await findOrderByStudioAndIdempotency(
        db,
        studio.id,
        bodyResult.data.idempotencyKey
      );
      if (existing) {
        return reply.status(200).send(OrderRecordSchema.parse(existing));
      }

      const admission = await prepareOrderAdmission(
        db,
        studio.id,
        session.sessionId,
        bodyResult.data.items
      );
      if (admission.error) {
        return sendError(
          reply,
          admission.error.status,
          admission.error.code,
          admission.error.message
        );
      }
      const itemsWithMeta = admission.items!;

      const quote = calculateOrderQuote({
        items: itemsWithMeta,
        rates: studio.settings.printRates as PricingMatrix | undefined,
      });
      const nowIso = new Date().toISOString();
      const orderId = 'ord_' + randomUUID();
      const orderNumber = 'ORD-' + randomUUID().substring(0, 6).toUpperCase();

      const created = await createOrderRecord(db, {
        orderId,
        orderNumber,
        studioId: studio.id,
        sessionId: session.sessionId,
        idempotencyKey: bodyResult.data.idempotencyKey,
        customerName: bodyResult.data.customerName,
        customerPhone: bodyResult.data.customerPhone,
        notes: bodyResult.data.notes,
        items: quote.items,
        totalSheets: quote.totalSheets,
        totalAmountMinor: quote.totalAmountMinor,
        currency: 'INR',
        status: 'submitted',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return reply.status(201).send(OrderRecordSchema.parse(created));
    }
  );

  // 3. Customer Order Status Retrieval
  app.get<{ Params: { slug: string; sessionId: string; orderId: string } }>(
    '/public/studios/:slug/sessions/:sessionId/orders/:orderId',
    async (request, reply) => {
      const session = authenticateCustomerSession(request, reply, config.sessionSecret);
      if (!session) return;

      const db = getEffectiveDb();
      const order = await findOrderBySessionAndId(
        db,
        session.studioId,
        session.sessionId,
        request.params.orderId
      );
      if (!order) {
        return sendError(reply, 404, 'ORDER_NOT_FOUND', 'Order was not found.');
      }

      return reply.status(200).send(OrderRecordSchema.parse(order));
    }
  );
};
