import { randomUUID } from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
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
import { findPhotoAssetsByIds } from './repositories/photo-asset.repository.js';
import { checkStudioCheckoutAvailability } from './repositories/subscription.repository.js';
import { validateOrderDuplexFeasibility } from './repositories/printer-allowance.repository.js';
import { StorageService } from './storage/storage-service.js';

export interface OrderRouteOptions {
  db?: Db;
  config?: AppConfig;
  storage?: StorageService;
}

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
        return reply.status(400).send({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid payload.' });
      }

      const duplexCheck = await validateOrderDuplexFeasibility(db, studio.id, bodyResult.data.items);
      if (!duplexCheck.allowed) {
        return reply.status(422).send({ statusCode: 422, code: 'NO_DUPLEX_SUPPORT', message: duplexCheck.reason });
      }

      const assetIds = Array.from(new Set(bodyResult.data.items.map((i) => i.assetId)));
      const assetMap = await findPhotoAssetsByIds(db, studio.id, session.sessionId, assetIds);

      const itemsWithMeta = [];
      for (const item of bodyResult.data.items) {
        const asset = assetMap.get(item.assetId);
        if (!asset) {
          return reply.status(404).send({ statusCode: 404, code: 'ASSET_NOT_FOUND', message: 'Asset not found.' });
        }
        itemsWithMeta.push({
          config: item,
          filename: asset.originalFilename,
          documentPageCount: asset.pageCount || 1,
        });
      }

      try {
        const quote = calculateOrderQuote({
          items: itemsWithMeta,
          rates: studio.settings.printRates as PricingMatrix | undefined,
        });
        return reply.status(200).send(QuoteResponseSchema.parse(quote));
      } catch (err) {
        return reply.status(400).send({
          statusCode: 400,
          code: 'PRICING_CALCULATION_ERROR',
          message: err instanceof Error ? err.message : 'Failed to calculate quotation.',
        });
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
        return reply
          .status(403)
          .send({ statusCode: 403, code: avail.reason, message: avail.reason });
      }

      const bodyResult = OrderSubmissionRequestSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid payload.' });
      }

      const duplexCheck = await validateOrderDuplexFeasibility(db, studio.id, bodyResult.data.items);
      if (!duplexCheck.allowed) {
        return reply.status(422).send({ statusCode: 422, code: 'NO_DUPLEX_SUPPORT', message: duplexCheck.reason });
      }

      const existing = await findOrderByStudioAndIdempotency(
        db,
        studio.id,
        bodyResult.data.idempotencyKey
      );
      if (existing) {
        return reply.status(200).send(OrderRecordSchema.parse(existing));
      }

      const assetIds = Array.from(new Set(bodyResult.data.items.map((i) => i.assetId)));
      const assetMap = await findPhotoAssetsByIds(db, studio.id, session.sessionId, assetIds);

      const itemsWithMeta = [];
      for (const item of bodyResult.data.items) {
        const asset = assetMap.get(item.assetId);
        if (!asset) {
          return reply.status(404).send({ statusCode: 404, code: 'ASSET_NOT_FOUND', message: 'Asset not found.' });
        }
        itemsWithMeta.push({
          config: item,
          filename: asset.originalFilename,
          documentPageCount: asset.pageCount || 1,
        });
      }

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
        return reply
          .status(404)
          .send({ statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'Order was not found.' });
      }

      return reply.status(200).send(OrderRecordSchema.parse(order));
    }
  );
};
