import { Db } from 'mongodb';
import {
  OperatorSession,
  OperatorSessionSchema,
  OperatorSessionStatus,
} from '@snapprint/contracts';

export const OPERATOR_SESSIONS_COLLECTION = 'operator_sessions';

export interface OperatorSessionDocument {
  sessionId: string; // Hashed session token identifier; never store raw session tokens
  userId: string;
  status: OperatorSessionStatus;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
}

/**
 * Converts a validated OperatorSession contract into a MongoDB document,
 * ensuring timestamps are stored as native BSON Date objects for TTL index compatibility.
 */
export function toOperatorSessionDocument(session: OperatorSession): OperatorSessionDocument {
  const createdAtDate =
    typeof session.createdAt === 'string' ? new Date(session.createdAt) : session.createdAt;
  const expiresAtDate =
    typeof session.expiresAt === 'string' ? new Date(session.expiresAt) : session.expiresAt;
  const lastActiveAtDate =
    typeof session.lastActiveAt === 'string'
      ? new Date(session.lastActiveAt)
      : session.lastActiveAt;

  if (
    Number.isNaN(createdAtDate.getTime()) ||
    Number.isNaN(expiresAtDate.getTime()) ||
    Number.isNaN(lastActiveAtDate.getTime())
  ) {
    throw new Error('Invalid timestamp provided for operator session persistence');
  }

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    status: session.status,
    createdAt: createdAtDate,
    expiresAt: expiresAtDate,
    lastActiveAt: lastActiveAtDate,
  };
}

/**
 * Converts a MongoDB document into a validated OperatorSession contract with ISO strings.
 */
export function toOperatorSessionContract(doc: OperatorSessionDocument): OperatorSession {
  return OperatorSessionSchema.parse({
    sessionId: doc.sessionId,
    userId: doc.userId,
    status: doc.status,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : new Date(doc.expiresAt).toISOString(),
    lastActiveAt:
      doc.lastActiveAt instanceof Date
        ? doc.lastActiveAt.toISOString()
        : new Date(doc.lastActiveAt).toISOString(),
  });
}

/**
 * Persists a new operator session in MongoDB with native BSON Date timestamps.
 */
export async function createOperatorSession(
  db: Db,
  session: OperatorSession
): Promise<OperatorSession> {
  const doc = toOperatorSessionDocument(session);
  await db.collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION).insertOne(doc);
  return toOperatorSessionContract(doc);
}

/**
 * Finds an operator session by its hashed token identifier.
 */
export async function findOperatorSessionByToken(
  db: Db,
  hashedToken: string
): Promise<OperatorSession | null> {
  const doc = await db
    .collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION)
    .findOne({ sessionId: hashedToken }, { projection: { _id: 0 } });

  if (!doc) {
    return null;
  }

  return toOperatorSessionContract(doc);
}

/**
 * Finds an active operator session by hashed token, enforcing expiration at both
 * query level and application level.
 */
export async function findActiveOperatorSession(
  db: Db,
  hashedToken: string,
  now: Date = new Date()
): Promise<OperatorSession | null> {
  const doc = await db.collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION).findOne(
    {
      sessionId: hashedToken,
      status: 'active',
      expiresAt: { $gt: now },
    },
    { projection: { _id: 0 } }
  );

  if (!doc) {
    return null;
  }

  // Application-level safety check
  if (doc.status !== 'active' || doc.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  return toOperatorSessionContract(doc);
}

/**
 * Revokes a single operator session. Strictly verifies user ownership by requiring userId.
 */
export async function revokeOperatorSession(
  db: Db,
  sessionId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION)
    .updateOne({ sessionId, userId, status: 'active' }, { $set: { status: 'revoked' } });

  return result.modifiedCount > 0;
}

/**
 * Revokes all active operator sessions for a specific user.
 */
export async function revokeAllUserSessions(db: Db, userId: string): Promise<number> {
  const result = await db
    .collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION)
    .updateMany({ userId, status: 'active' }, { $set: { status: 'revoked' } });

  return result.modifiedCount;
}

/**
 * Updates the lastActiveAt timestamp for an active operator session.
 */
export async function touchOperatorSession(
  db: Db,
  sessionId: string,
  lastActiveAt: Date = new Date()
): Promise<boolean> {
  const result = await db
    .collection<OperatorSessionDocument>(OPERATOR_SESSIONS_COLLECTION)
    .updateOne({ sessionId, status: 'active' }, { $set: { lastActiveAt } });

  return result.matchedCount > 0;
}
