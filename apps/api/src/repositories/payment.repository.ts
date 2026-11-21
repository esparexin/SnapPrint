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
    sessionId: doc.sessionId,
    method: doc.method,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    status: doc.status,
    gatewayOrderId: doc.gatewayOrderId,
    gatewayPaymentId: doc.gatewayPaymentId,
    gatewaySignature: doc.gatewaySignature,
    recordedByUserId: doc.recordedByUserId,
    notes: doc.notes,
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
  metadata?: { gatewayPaymentId?: string; gatewaySignature?: string }
): Promise<PaymentRecord | null> {
  const now = new Date();
  const updateFields: Record<string, unknown> = { status, updatedAt: now };
  if (metadata?.gatewayPaymentId) {
    updateFields.gatewayPaymentId = metadata.gatewayPaymentId;
  }
  if (metadata?.gatewaySignature) {
    updateFields.gatewaySignature = metadata.gatewaySignature;
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
