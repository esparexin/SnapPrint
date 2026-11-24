import { randomUUID } from 'node:crypto';
import { Db } from 'mongodb';
import {
  AdminOverrideSubscriptionRequest,
  PLAN_DURATIONS_DAYS,
  StudioSubscriptionRecord,
} from '@snapprint/contracts';
import { isSubscriptionActive } from '@snapprint/domain';
import { AUDIT_LOGS_COLLECTION } from './platform-admin.repository.js';
import {
  SUBSCRIPTIONS_COLLECTION,
  StudioSubscriptionDocument,
  toSubscriptionRecord,
} from './subscription.repository.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function overridePlatformStudioSubscription(
  db: Db,
  studioId: string,
  request: AdminOverrideSubscriptionRequest,
  actorId: string,
  now: Date = new Date()
): Promise<StudioSubscriptionRecord> {
  const existing = await db
    .collection<StudioSubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
    .findOne({ studioId });

  const durationDays =
    request.durationDays && request.durationDays > 0
      ? request.durationDays
      : PLAN_DURATIONS_DAYS[request.plan] || 30;

  let startsAt: Date = now;
  let expiresAt: Date;

  if (existing && isSubscriptionActive(existing.expiresAt, now)) {
    // Cumulative extension from current active expiration
    const currentExp =
      existing.expiresAt instanceof Date ? existing.expiresAt : new Date(existing.expiresAt);
    expiresAt = new Date(currentExp.getTime() + durationDays * MS_PER_DAY);
    startsAt = existing.startsAt instanceof Date ? existing.startsAt : new Date(existing.startsAt);
  } else {
    // New or renewed subscription starting now
    startsAt = now;
    expiresAt = new Date(now.getTime() + durationDays * MS_PER_DAY);
  }

  const updatedDoc: StudioSubscriptionDocument = {
    studioId,
    plan: request.plan,
    status: 'active',
    startsAt,
    expiresAt,
    updatedAt: now,
  };

  await db
    .collection<StudioSubscriptionDocument>(SUBSCRIPTIONS_COLLECTION)
    .updateOne({ studioId }, { $set: updatedDoc }, { upsert: true });

  // Record immutable compliance audit log
  await db.collection(AUDIT_LOGS_COLLECTION).insertOne({
    id: `audit_${randomUUID()}`,
    timestamp: now,
    actorId,
    action: 'studio.subscription_override',
    targetType: 'studio',
    targetId: studioId,
    reason: request.reason,
    metadata: {
      plan: request.plan,
      durationDays,
      previousExpiresAt: existing?.expiresAt ? new Date(existing.expiresAt).toISOString() : null,
      newExpiresAt: expiresAt.toISOString(),
    },
  });

  return toSubscriptionRecord(updatedDoc, now);
}
