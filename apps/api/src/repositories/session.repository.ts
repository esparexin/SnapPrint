import { Db } from 'mongodb';
import { CustomerQrSession, CustomerQrSessionSchema, QrSessionStatus } from '@snapprint/contracts';

export interface QrSessionDocument {
  sessionId: string;
  studioId: string;
  status: QrSessionStatus;
  createdAt: Date;
  expiresAt: Date;
}

export const QR_SESSIONS_COLLECTION = 'qr_sessions';

/**
 * Converts a validated CustomerQrSession contract into a MongoDB document,
 * ensuring timestamps are stored as native BSON Date objects for TTL index compatibility.
 */
export function toSessionDocument(session: CustomerQrSession): QrSessionDocument {
  const createdAtDate =
    typeof session.createdAt === 'string' ? new Date(session.createdAt) : session.createdAt;
  const expiresAtDate =
    typeof session.expiresAt === 'string' ? new Date(session.expiresAt) : session.expiresAt;

  if (Number.isNaN(createdAtDate.getTime()) || Number.isNaN(expiresAtDate.getTime())) {
    throw new Error('Invalid timestamp provided for session document persistence');
  }

  return {
    sessionId: session.sessionId,
    studioId: session.studioId,
    status: session.status,
    createdAt: createdAtDate,
    expiresAt: expiresAtDate,
  };
}

/**
 * Converts a MongoDB document into a validated CustomerQrSession contract with ISO string timestamps.
 */
export function toSessionContract(doc: QrSessionDocument): CustomerQrSession {
  return CustomerQrSessionSchema.parse({
    sessionId: doc.sessionId,
    studioId: doc.studioId,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : new Date(doc.expiresAt).toISOString(),
  });
}

/**
 * Persists a new customer QR session in MongoDB with native BSON Date timestamps.
 */
export async function createSessionRecord(
  db: Db,
  session: CustomerQrSession
): Promise<CustomerQrSession> {
  const document = toSessionDocument(session);
  await db.collection<QrSessionDocument>(QR_SESSIONS_COLLECTION).insertOne(document);
  return toSessionContract(document);
}

/**
 * Finds a customer session by its sessionId, strictly scoped to the tenant studioId.
 */
export async function findSessionRecord(
  db: Db,
  studioId: string,
  sessionId: string
): Promise<CustomerQrSession | null> {
  const doc = await db.collection<QrSessionDocument>(QR_SESSIONS_COLLECTION).findOne({
    studioId,
    sessionId,
  });

  if (!doc) {
    return null;
  }

  return toSessionContract(doc);
}

/**
 * Updates a customer session status, strictly scoped to the tenant studioId.
 */
export async function updateSessionStatusRecord(
  db: Db,
  studioId: string,
  sessionId: string,
  status: QrSessionStatus
): Promise<boolean> {
  const result = await db
    .collection<QrSessionDocument>(QR_SESSIONS_COLLECTION)
    .updateOne({ studioId, sessionId }, { $set: { status } });

  return result.matchedCount > 0;
}
