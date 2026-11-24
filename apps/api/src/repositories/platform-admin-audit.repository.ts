import { Db } from 'mongodb';
import {
  ListPlatformAuditLogsResponse,
  PlatformAuditEntry,
  PlatformStudioItem,
  StudioStatus,
} from '@snapprint/contracts';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';
import { toPlatformStudioItem } from './platform-admin.repository.js';

export const AUDIT_LOGS_COLLECTION = 'platform_audit_logs';

export interface PlatformAuditLogDocument {
  id: string;
  timestamp: Date;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export async function updateStudioStatusWithAudit(
  db: Db,
  studioId: string,
  newStatus: StudioStatus,
  actorId: string,
  reason?: string
): Promise<PlatformStudioItem | null> {
  const existing = (await db
    .collection(STUDIOS_COLLECTION)
    .findOne({ id: studioId })) as unknown as StudioDocument | null;

  if (!existing) return null;

  const now = new Date();
  await db
    .collection(STUDIOS_COLLECTION)
    .updateOne({ id: studioId }, { $set: { status: newStatus, updatedAt: now } });

  const auditEntry: PlatformAuditLogDocument = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: now,
    actorId,
    action: 'studio.status_change',
    targetType: 'studio',
    targetId: studioId,
    reason: reason || undefined,
    metadata: { previousStatus: existing.status, newStatus },
  };

  await db.collection(AUDIT_LOGS_COLLECTION).insertOne(auditEntry);
  return toPlatformStudioItem({ ...existing, status: newStatus, updatedAt: now });
}

export async function listPlatformAuditLogs(
  db: Db,
  limit = 50
): Promise<ListPlatformAuditLogsResponse> {
  const [logs, total] = await Promise.all([
    db
      .collection(AUDIT_LOGS_COLLECTION)
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray() as unknown as Promise<PlatformAuditLogDocument[]>,
    db.collection(AUDIT_LOGS_COLLECTION).countDocuments({}),
  ]);

  const auditLogs: PlatformAuditEntry[] = logs.map((doc) => ({
    id: doc.id,
    timestamp: toIsoString(doc.timestamp),
    actorId: doc.actorId,
    action: doc.action,
    targetType: doc.targetType,
    targetId: doc.targetId,
    reason: doc.reason,
    metadata: doc.metadata,
  }));

  return { auditLogs, total };
}
