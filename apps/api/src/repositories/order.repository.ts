import { Db } from 'mongodb';
import {
  OrderAuditEvent,
  OrderPaymentStatus,
  OrderRecord,
  OrderRecordInput,
  OrderRecordSchema,
  OrderStatus,
} from '@snapprint/contracts';

export const ORDERS_COLLECTION = 'orders';

export interface OrderDocument {
  orderId: string;
  orderNumber: string;
  studioId: string;
  sessionId: string;
  idempotencyKey: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: unknown[];
  totalSheets: number;
  totalAmountMinor: number;
  currency: 'INR';
  status: OrderStatus;
  paidAmountMinor?: number;
  paymentStatus?: OrderPaymentStatus;
  events?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export function toOrderContract(doc: OrderDocument): OrderRecord {
  return OrderRecordSchema.parse({
    orderId: doc.orderId,
    orderNumber: doc.orderNumber,
    studioId: doc.studioId,
    sessionId: doc.sessionId,
    idempotencyKey: doc.idempotencyKey,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    notes: doc.notes,
    items: doc.items,
    totalSheets: doc.totalSheets,
    totalAmountMinor: doc.totalAmountMinor,
    currency: doc.currency,
    status: doc.status,
    paidAmountMinor: doc.paidAmountMinor ?? 0,
    paymentStatus: doc.paymentStatus ?? 'UNPAID',
    events: Array.isArray(doc.events) ? doc.events : [],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  });
}

export async function createOrderRecord(db: Db, order: OrderRecordInput): Promise<OrderRecord> {
  const parsed = OrderRecordSchema.parse(order);
  const createdDate = new Date(parsed.createdAt);
  const updatedDate = new Date(parsed.updatedAt);

  const doc: OrderDocument = {
    orderId: parsed.orderId,
    orderNumber: parsed.orderNumber,
    studioId: parsed.studioId,
    sessionId: parsed.sessionId,
    idempotencyKey: parsed.idempotencyKey,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    notes: parsed.notes,
    items: parsed.items,
    totalSheets: parsed.totalSheets,
    totalAmountMinor: parsed.totalAmountMinor,
    currency: parsed.currency,
    status: parsed.status,
    paidAmountMinor: parsed.paidAmountMinor ?? 0,
    paymentStatus: parsed.paymentStatus ?? 'UNPAID',
    events: parsed.events ?? [],
    createdAt: Number.isNaN(createdDate.getTime()) ? new Date() : createdDate,
    updatedAt: Number.isNaN(updatedDate.getTime()) ? new Date() : updatedDate,
  };

  await db.collection<OrderDocument>(ORDERS_COLLECTION).insertOne(doc);
  return toOrderContract(doc);
}

export async function findOrderByStudioAndIdempotency(
  db: Db,
  studioId: string,
  idempotencyKey: string
): Promise<OrderRecord | null> {
  const doc = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .findOne({ studioId, idempotencyKey }, { projection: { _id: 0 } });
  return doc ? toOrderContract(doc) : null;
}

export async function findOrderById(
  db: Db,
  studioId: string,
  orderId: string
): Promise<OrderRecord | null> {
  const doc = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .findOne({ studioId, orderId }, { projection: { _id: 0 } });
  return doc ? toOrderContract(doc) : null;
}

export async function findOrderBySessionAndId(
  db: Db,
  studioId: string,
  sessionId: string,
  orderId: string
): Promise<OrderRecord | null> {
  const doc = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .findOne({ studioId, sessionId, orderId }, { projection: { _id: 0 } });
  return doc ? toOrderContract(doc) : null;
}

export interface ListOrdersOptions {
  status?: OrderStatus;
  limit?: number;
}

export async function listOrdersByStudio(
  db: Db,
  studioId: string,
  opts?: ListOrdersOptions | number
): Promise<OrderRecord[]> {
  const limit = typeof opts === 'number' ? opts : (opts?.limit ?? 50);
  const filter: Record<string, unknown> = { studioId };
  if (typeof opts === 'object' && opts?.status) {
    filter.status = opts.status;
  }

  const docs = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .toArray();
  return docs.map(toOrderContract);
}

export async function updateOrderStatus(
  db: Db,
  studioId: string,
  orderId: string,
  status: OrderStatus,
  event?: OrderAuditEvent
): Promise<OrderRecord | null> {
  const now = new Date();
  const updateOps: { $set: Record<string, unknown>; $push?: Record<string, unknown> } = {
    $set: { status, updatedAt: now },
  };
  if (event) {
    updateOps.$push = { events: event };
  }

  const result = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .findOneAndUpdate({ studioId, orderId }, updateOps, {
      returnDocument: 'after',
      projection: { _id: 0 },
    });
  return result ? toOrderContract(result) : null;
}

export async function updateOrderPaymentSummary(
  db: Db,
  studioId: string,
  orderId: string,
  paidAmountMinor: number,
  paymentStatus: OrderPaymentStatus
): Promise<OrderRecord | null> {
  const now = new Date();
  const result = await db
    .collection<OrderDocument>(ORDERS_COLLECTION)
    .findOneAndUpdate(
      { studioId, orderId },
      { $set: { paidAmountMinor, paymentStatus, updatedAt: now } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  return result ? toOrderContract(result) : null;
}
