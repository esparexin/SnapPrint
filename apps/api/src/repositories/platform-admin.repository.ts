import { Db } from 'mongodb';
import {
  ListPlatformAuditLogsResponse,
  ListPlatformStudiosQuery,
  ListPlatformStudiosResponse,
  ListPlatformUsersResponse,
  PlatformAuditEntry,
  PlatformMetricsResponse,
  PlatformStudioItem,
  StudioStatus,
} from '@snapprint/contracts';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';

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

export function toPlatformStudioItem(doc: StudioDocument): PlatformStudioItem {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    status: doc.status,
    ownerUserId: doc.ownerUserId,
    contactPhone: doc.settings?.contactPhone ?? doc.contactPhone,
    contactEmail: doc.settings?.contactEmail ?? doc.contactEmail,
    isAcceptingOrders: doc.settings?.isAcceptingOrders,
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

  return {
    studios: paginated.map(toPlatformStudioItem),
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

export async function listPlatformUsers(db: Db, limit = 50): Promise<ListPlatformUsersResponse> {
  const users = await db
    .collection('users')
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const userIds = users.map((u) => u.id as string);
  const memberships = await db
    .collection('user_memberships')
    .find({ userId: { $in: userIds }, status: 'active' })
    .toArray();

  const membershipMap = new Map<string, { role: string; studioId?: string }>();
  for (const m of memberships) {
    if (!membershipMap.has(m.userId) || m.role === 'platform_admin') {
      membershipMap.set(m.userId, { role: m.role, studioId: m.studioId });
    }
  }

  const result = users.map((u) => {
    const mem = membershipMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      status: (u.status || 'active') as 'active' | 'suspended' | 'pending_verification',
      role: (mem?.role || 'studio_owner') as 'platform_admin' | 'studio_owner' | 'studio_staff',
      studioId: mem?.studioId || null,
      createdAt: toIsoString(u.createdAt),
    };
  });

  return {
    users: result,
    total: await db.collection('users').countDocuments({}),
  };
}
