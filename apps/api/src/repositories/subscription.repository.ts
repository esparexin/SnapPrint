import { Db } from 'mongodb';
import {
  StudioSubscriptionRecord,
  StudioSubscriptionRecordSchema,
  SubscriptionPlanId,
  SubscriptionStatus,
} from '@snapprint/contracts';
import {
  evaluateOrderFulfillmentEntitlement,
  evaluateStorefrontCheckoutAvailability,
  extendSubscription,
  isSubscriptionActive,
  StorefrontCheckoutAvailabilityDecision,
} from '@snapprint/domain';
import { findOrderById } from './order.repository.js';
import { listPaymentsByOrder } from './payment.repository.js';
import { hasActivePrinterAssigned, hasOnlineAgentDevice } from './printer.repository.js';

export const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
export const SUBSCRIPTION_ORDERS_COLLECTION = 'subscription_orders';

export interface StudioSubscriptionDocument {
  studioId: string;
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  startsAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

export interface SubscriptionOrderDocument {
  subscriptionOrderId: string;
  studioId: string;
  plan: SubscriptionPlanId;
  durationDays: number;
  amountMinor: number;
  currency: 'INR';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  status: 'CREATED' | 'PAID' | 'FAILED';
  capturedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toSubscriptionRecord(
  doc: StudioSubscriptionDocument,
  now: Date | string = new Date()
): StudioSubscriptionRecord {
  const active = isSubscriptionActive(doc.expiresAt, now);
  return StudioSubscriptionRecordSchema.parse({
    studioId: doc.studioId,
    plan: doc.plan,
    status: active ? 'active' : 'expired',
    startsAt:
      doc.startsAt instanceof Date
        ? doc.startsAt.toISOString()
        : new Date(doc.startsAt).toISOString(),
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : new Date(doc.expiresAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  });
}

export async function getStudioSubscription(
  db: Db,
  studioId: string,
  now?: Date | string
): Promise<StudioSubscriptionRecord | null> {
  const doc = await db
    .collection<StudioSubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
    .findOne({ studioId }, { projection: { _id: 0 } });
  return doc ? toSubscriptionRecord(doc, now) : null;
}

export async function upsertStudioSubscription(
  db: Db,
  record: StudioSubscriptionRecord
): Promise<StudioSubscriptionRecord> {
  const parsed = StudioSubscriptionRecordSchema.parse(record);
  const now = new Date();
  const startsAt = new Date(parsed.startsAt);
  const expiresAt = new Date(parsed.expiresAt);

  const doc: StudioSubscriptionDocument = {
    studioId: parsed.studioId,
    plan: parsed.plan,
    status: parsed.status,
    startsAt: Number.isNaN(startsAt.getTime()) ? now : startsAt,
    expiresAt: Number.isNaN(expiresAt.getTime()) ? now : expiresAt,
    updatedAt: now,
  };

  await db
    .collection<StudioSubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
    .updateOne({ studioId: doc.studioId }, { $set: doc }, { upsert: true });

  return toSubscriptionRecord(doc);
}

export async function applySubscriptionRenewal(
  db: Db,
  studioId: string,
  plan: SubscriptionPlanId,
  renewalTimestamp: Date | string = new Date()
): Promise<StudioSubscriptionRecord> {
  const current = await getStudioSubscription(db, studioId);
  const result = extendSubscription(current?.expiresAt, plan, renewalTimestamp);

  const now = new Date();
  const startsAt = current ? new Date(current.startsAt) : new Date(result.previousExpiresAt);
  const expiresAt = new Date(result.newExpiresAt);

  const updatedDoc: StudioSubscriptionDocument = {
    studioId,
    plan,
    status: 'active',
    startsAt,
    expiresAt,
    updatedAt: now,
  };

  await db
    .collection<StudioSubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
    .updateOne({ studioId }, { $set: updatedDoc }, { upsert: true });

  return toSubscriptionRecord(updatedDoc);
}

export async function createSubscriptionOrder(
  db: Db,
  order: Omit<SubscriptionOrderDocument, 'createdAt' | 'updatedAt'>
): Promise<SubscriptionOrderDocument> {
  const now = new Date();
  const doc: SubscriptionOrderDocument = {
    ...order,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<SubscriptionOrderDocument>(SUBSCRIPTION_ORDERS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findSubscriptionOrderByGatewayOrderId(
  db: Db,
  gatewayOrderId: string
): Promise<SubscriptionOrderDocument | null> {
  return db
    .collection<SubscriptionOrderDocument>(SUBSCRIPTION_ORDERS_COLLECTION)
    .findOne({ gatewayOrderId }, { projection: { _id: 0 } });
}

export async function updateSubscriptionOrderStatus(
  db: Db,
  gatewayOrderId: string,
  status: 'PAID' | 'FAILED',
  metadata?: { gatewayPaymentId?: string; capturedAt?: Date | string }
): Promise<SubscriptionOrderDocument | null> {
  const now = new Date();
  const updateFields: Record<string, unknown> = { status, updatedAt: now };
  if (metadata?.gatewayPaymentId) {
    updateFields.gatewayPaymentId = metadata.gatewayPaymentId;
  }
  if (metadata?.capturedAt) {
    const d =
      metadata.capturedAt instanceof Date ? metadata.capturedAt : new Date(metadata.capturedAt);
    if (!Number.isNaN(d.getTime())) {
      updateFields.capturedAt = d;
    }
  }

  const result = await db
    .collection<SubscriptionOrderDocument>(SUBSCRIPTION_ORDERS_COLLECTION)
    .findOneAndUpdate(
      { gatewayOrderId },
      { $set: updateFields },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  return result;
}

export async function isJobEntitledForFulfillment(
  db: Db,
  studioId: string,
  orderId: string,
  sub: StudioSubscriptionRecord | null,
  now: Date | string = new Date()
): Promise<boolean> {
  if (sub && isSubscriptionActive(sub.expiresAt, now)) {
    return true;
  }
  if (!sub) {
    return false;
  }
  const order = await findOrderById(db, studioId, orderId);
  if (!order || order.paymentStatus !== 'PAID') {
    return false;
  }
  const payments = await listPaymentsByOrder(db, studioId, orderId);
  const succeededPayment = payments.find((p) => p.status === 'SUCCEEDED');
  const capturedAt = succeededPayment?.gatewayCapturedAt;
  if (!capturedAt) {
    return false;
  }

  const decision = evaluateOrderFulfillmentEntitlement({
    paymentStatus: order.paymentStatus,
    paymentCapturedAt: capturedAt,
    subscriptionExpiresAt: sub.expiresAt,
  });
  return decision.allowed;
}

export async function checkStudioCheckoutAvailability(
  db: Db,
  studio: { id: string; status: string; isAcceptingOrders?: boolean },
  now: Date | string = new Date(),
  cachedActivePrinter?: boolean
): Promise<StorefrontCheckoutAvailabilityDecision> {
  const [sub, hasOnlineAgent, hasActivePrinter] = await Promise.all([
    getStudioSubscription(db, studio.id, now),
    hasOnlineAgentDevice(db, studio.id),
    cachedActivePrinter !== undefined
      ? cachedActivePrinter
      : hasActivePrinterAssigned(db, studio.id),
  ]);
  const hasActiveSubscription = Boolean(sub && isSubscriptionActive(sub.expiresAt, now));

  return evaluateStorefrontCheckoutAvailability({
    studioStatus: studio.status,
    isAcceptingOrders: studio.isAcceptingOrders ?? true,
    hasActiveSubscription,
    hasOnlineAgent,
    hasActivePrinter,
  });
}
