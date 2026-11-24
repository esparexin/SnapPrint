import { Db } from 'mongodb';
import {
  ListPlatformStudiosQuery,
  ListPlatformStudiosResponse,
  PlatformMetricsResponse,
  PlatformStudioItem,
  SubscriptionPlanId,
  SubscriptionStatus,
} from '@snapprint/contracts';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';

export { getPlatformStudioDetails } from './platform-studio-details.repository.js';
export {
  createPlatformAdminUser,
  listPlatformUsers,
  updatePlatformUserStatus,
} from './platform-user-admin.repository.js';

export {
  AUDIT_LOGS_COLLECTION,
  updateStudioStatusWithAudit,
  listPlatformAuditLogs,
} from './platform-admin-audit.repository.js';
export type { PlatformAuditLogDocument } from './platform-admin-audit.repository.js';

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
  printerCount?: number,
  subscription?: { plan: SubscriptionPlanId; status: SubscriptionStatus; expiresAt?: string } | null
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
    subscription: subscription ?? undefined,
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}

export async function listPlatformStudios(
  db: Db,
  query: ListPlatformStudiosQuery
): Promise<ListPlatformStudiosResponse> {
  const rawStudios = (await db
    .collection(STUDIOS_COLLECTION)
    .find(query.status ? { status: query.status } : {})
    .toArray()) as unknown as StudioDocument[];

  let filtered = rawStudios;
  if (query.search) {
    const term = query.search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(term) || s.slug.toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = filtered.length;
  const paginated = filtered.slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? 50));

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
  const [printers, rawSubs] = await Promise.all([
    sIds.length > 0
      ? db
          .collection('studio_printers')
          .find({ studioId: { $in: sIds } })
          .toArray()
      : [],
    sIds.length > 0
      ? db
          .collection('subscriptions')
          .find({ studioId: { $in: sIds } })
          .toArray()
      : [],
  ]);

  const printerMap = new Map<string, number>();
  for (const p of printers) {
    const sId = (p as { studioId?: string }).studioId;
    if (sId) printerMap.set(sId, (printerMap.get(sId) ?? 0) + 1);
  }

  const subMap = new Map<
    string,
    { plan: SubscriptionPlanId; status: SubscriptionStatus; expiresAt?: string }
  >();
  for (const sub of rawSubs) {
    const s = sub as Record<string, unknown>;
    const sId = s.studioId as string | undefined;
    if (sId && s.plan) {
      const isAct = s.expiresAt
        ? new Date(s.expiresAt as string).getTime() > Date.now()
        : s.status === 'active';
      subMap.set(sId, {
        plan: s.plan as SubscriptionPlanId,
        status: isAct ? 'active' : 'expired',
        expiresAt: s.expiresAt ? toIsoString(s.expiresAt) : undefined,
      });
    }
  }

  return {
    studios: paginated.map((s) =>
      toPlatformStudioItem(
        s,
        s.ownerUserId ? ownerMap.get(s.ownerUserId) : undefined,
        printerMap.get(s.id) ?? 0,
        subMap.get(s.id)
      )
    ),
    total,
  };
}
