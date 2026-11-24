import { Db } from 'mongodb';
import {
  ListPlatformAuditLogsResponse,
  ListPlatformStudiosQuery,
  ListPlatformStudiosResponse,
  PlatformAuditEntry,
  PlatformMetricsResponse,
  PlatformStudioItem,
  StudioStatus,
} from '@snapprint/contracts';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';

export { getPlatformStudioDetails } from './platform-studio-details.repository.js';
export {
  createPlatformAdminUser,
  listPlatformUsers,
  updatePlatformUserStatus,
} from './platform-user-admin.repository.js';

export const AUDIT_LOGS_COLLECTION = 'audit_logs';

export interface PlatformAuditLogDocument {
  id: string;
  timestamp: Date | string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function getPlatformMetrics(db: Db): Promise<PlatformMetricsResponse> {
  const [
    totalStudios,
    activeStudios,
    onboardingStudios,
    suspendedStudios,
    totalOrdersCount,
    payments,
  ] = await Promise.all([
    db.collection(STUDIOS_COLLECTION).countDocuments({}),
    db.collection(STUDIOS_COLLECTION).countDocuments({ status: 'active' }),
    db
      .collection(STUDIOS_COLLECTION)
      .countDocuments({ status: { $in: ['onboarding', 'pending_review'] } }),
    db.collection(STUDIOS_COLLECTION).countDocuments({ status: 'suspended' }),
    db.collection('orders').countDocuments({}),
    db
      .collection('payments')
      .find({ status: { $in: ['SUCCEEDED', 'completed'] } })
      .toArray(),
  ]);

  const totalPaidVolumeMinor = payments.reduce((sum, p) => {
    const raw = p as Record<string, unknown>;
    const amt = Number(raw.amountMinor ?? raw.amount ?? 0);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  return {
    totalStudios,
    activeStudios,
    onboardingStudios,
    suspendedStudios,
    totalOrdersCount,
    totalPaidVolumeMinor,
    currency: 'INR',
  };
}

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return new Date(val).toISOString();
  return new Date().toISOString();
}

export function toPlatformStudioItem(
  doc: StudioDocument,
  owner?: { name?: string; email?: string },
  printerCount?: number
): PlatformStudioItem {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    status: doc.status,
    ownerUserId: doc.ownerUserId,
    ownerName: owner?.name,
    ownerEmail: owner?.email ?? doc.settings?.contactEmail ?? doc.contactEmail,
    contactPhone: doc.settings?.contactPhone ?? doc.contactPhone,
    contactEmail: doc.settings?.contactEmail ?? doc.contactEmail,
    isAcceptingOrders: doc.settings?.isAcceptingOrders,
    printerCount: printerCount ?? 0,
    payment: doc.payment,
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}

export async function listPlatformStudios(
  db: Db,
  query: ListPlatformStudiosQuery
): Promise<ListPlatformStudiosResponse> {
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  }

  const rawStudios = (await db
    .collection(STUDIOS_COLLECTION)
    .find(filter)
    .toArray()) as unknown as StudioDocument[];

  let filtered = rawStudios;
  if (query.search) {
    const term = query.search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(term) || s.slug.toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const total = filtered.length;
  const skip = query.skip ?? 0;
  const limit = query.limit ?? 50;
  const paginated = filtered.slice(skip, skip + limit);

  const ownerUserIds = Array.from(
    new Set(paginated.map((s) => s.ownerUserId).filter(Boolean))
  ) as string[];
  const owners =
    ownerUserIds.length > 0
      ? await db
          .collection('users')
          .find({ id: { $in: ownerUserIds } }, { projection: { id: 1, name: 1, email: 1 } })
          .toArray()
      : [];
  const ownerMap = new Map(
    owners.map((u) => [u.id as string, { name: u.name as string, email: u.email as string }])
  );

  const sIds = paginated.map((s) => s.id);
  const printers =
    sIds.length > 0
      ? await db
          .collection('studio_printers')
          .find({ studioId: { $in: sIds } })
          .toArray()
      : [];
  const printerMap = new Map<string, number>();
  for (const p of printers) {
    const sId = (p as { studioId?: string }).studioId;
    if (sId) printerMap.set(sId, (printerMap.get(sId) ?? 0) + 1);
  }

  return {
    studios: paginated.map((s) =>
      toPlatformStudioItem(
        s,
        s.ownerUserId ? ownerMap.get(s.ownerUserId) : undefined,
        printerMap.get(s.id) ?? 0
      )
    ),
    total,
  };
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

  if (!existing) {
    return null;
  }

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
    metadata: {
      previousStatus: existing.status,
      newStatus,
    },
  };

  await db.collection(AUDIT_LOGS_COLLECTION).insertOne(auditEntry);

  return toPlatformStudioItem({
    ...existing,
    status: newStatus,
    updatedAt: now,
  });
}

export async function listPlatformAuditLogs(
  db: Db,
  limit = 50
): Promise<ListPlatformAuditLogsResponse> {
  const logs = (await db
    .collection(AUDIT_LOGS_COLLECTION)
    .find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()) as unknown as PlatformAuditLogDocument[];

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

  const total = await db.collection(AUDIT_LOGS_COLLECTION).countDocuments({});

  return {
    auditLogs,
    total,
  };
}
