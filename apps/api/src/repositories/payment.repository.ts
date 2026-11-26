import { Db } from 'mongodb';
import {
  PaymentMethod,
  PaymentRecord,
  PaymentRecordSchema,
  PaymentStatus,
} from '@snapprint/contracts';

export const PAYMENTS_COLLECTION = 'payments';

export interface PaymentDocument {
  paymentId: string;
  orderId: string;
  studioId: string;
  sessionId?: string;
  method: PaymentMethod;
  amountMinor: number;
  currency: 'INR';
  status: PaymentStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  gatewayCapturedAt?: Date;
  refundId?: string;
  refundedAt?: Date;
  recordedByUserId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPaymentContract(doc: PaymentDocument): PaymentRecord {
  return PaymentRecordSchema.parse({
    paymentId: doc.paymentId,
    orderId: doc.orderId,
    studioId: doc.studioId,
    sessionId: doc.sessionId ?? undefined,
    method: doc.method,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    status: doc.status,
    gatewayOrderId: doc.gatewayOrderId ?? undefined,
    gatewayPaymentId: doc.gatewayPaymentId ?? undefined,
    gatewaySignature: doc.gatewaySignature ?? undefined,
    gatewayCapturedAt: doc.gatewayCapturedAt
      ? doc.gatewayCapturedAt instanceof Date
        ? doc.gatewayCapturedAt.toISOString()
        : new Date(doc.gatewayCapturedAt).toISOString()
      : undefined,
    refundId: doc.refundId ?? undefined,
    refundedAt: doc.refundedAt
      ? doc.refundedAt instanceof Date
        ? doc.refundedAt.toISOString()
        : new Date(doc.refundedAt).toISOString()
      : undefined,
    recordedByUserId: doc.recordedByUserId ?? undefined,
    notes: doc.notes ?? undefined,
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

export async function createPaymentRecord(db: Db, payment: PaymentRecord): Promise<PaymentRecord> {
  const parsed = PaymentRecordSchema.parse(payment);
  const createdDate = new Date(parsed.createdAt);
  const updatedDate = new Date(parsed.updatedAt);

  const doc: PaymentDocument = {
    paymentId: parsed.paymentId,
    orderId: parsed.orderId,
    studioId: parsed.studioId,
    sessionId: parsed.sessionId,
    method: parsed.method,
    amountMinor: parsed.amountMinor,
    currency: parsed.currency,
    status: parsed.status,
    gatewayOrderId: parsed.gatewayOrderId,
    gatewayPaymentId: parsed.gatewayPaymentId,
    gatewaySignature: parsed.gatewaySignature,
    gatewayCapturedAt: parsed.gatewayCapturedAt ? new Date(parsed.gatewayCapturedAt) : undefined,
    recordedByUserId: parsed.recordedByUserId,
    notes: parsed.notes,
    createdAt: Number.isNaN(createdDate.getTime()) ? new Date() : createdDate,
    updatedAt: Number.isNaN(updatedDate.getTime()) ? new Date() : updatedDate,
  };

  await db.collection<PaymentDocument>(PAYMENTS_COLLECTION).insertOne(doc);
  return toPaymentContract(doc);
}

export async function findPaymentById(
  db: Db,
  studioId: string,
  paymentId: string
): Promise<PaymentRecord | null> {
  const doc = await db
    .collection<PaymentDocument>(PAYMENTS_COLLECTION)
    .findOne({ studioId, paymentId }, { projection: { _id: 0 } });
  return doc ? toPaymentContract(doc) : null;
}

export async function findPaymentByGatewayOrderId(
  db: Db,
  gatewayOrderId: string
): Promise<PaymentRecord | null> {
  const doc = await db
    .collection<PaymentDocument>(PAYMENTS_COLLECTION)
    .findOne({ gatewayOrderId }, { projection: { _id: 0 } });
  return doc ? toPaymentContract(doc) : null;
}

export async function listPaymentsByOrder(
  db: Db,
  studioId: string,
  orderId: string
): Promise<PaymentRecord[]> {
  const docs = await db
    .collection<PaymentDocument>(PAYMENTS_COLLECTION)
    .find({ studioId, orderId }, { projection: { _id: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toPaymentContract);
}

export async function updatePaymentStatus(
  db: Db,
  studioId: string,
  paymentId: string,
  status: PaymentStatus,
  metadata?: {
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    gatewayCapturedAt?: Date | string;
    refundId?: string;
    refundedAt?: Date | string;
  }
): Promise<PaymentRecord | null> {
  const now = new Date();
  const updateFields: Record<string, unknown> = { status, updatedAt: now };
  if (metadata?.gatewayPaymentId) {
    updateFields.gatewayPaymentId = metadata.gatewayPaymentId;
  }
  if (metadata?.gatewaySignature) {
    updateFields.gatewaySignature = metadata.gatewaySignature;
  }
  if (metadata?.gatewayCapturedAt) {
    const d =
      metadata.gatewayCapturedAt instanceof Date
        ? metadata.gatewayCapturedAt
        : new Date(metadata.gatewayCapturedAt);
    if (!Number.isNaN(d.getTime())) {
      updateFields.gatewayCapturedAt = d;
    }
  }
  if (metadata?.refundId) {
    updateFields.refundId = metadata.refundId;
  }
  if (metadata?.refundedAt) {
    const d =
      metadata.refundedAt instanceof Date ? metadata.refundedAt : new Date(metadata.refundedAt);
    if (!Number.isNaN(d.getTime())) {
      updateFields.refundedAt = d;
    }
  }

  const result = await db
    .collection<PaymentDocument>(PAYMENTS_COLLECTION)
    .findOneAndUpdate(
      { studioId, paymentId },
      { $set: updateFields },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  return result ? toPaymentContract(result) : null;
}
