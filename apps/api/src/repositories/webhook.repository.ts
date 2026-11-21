import { Db } from 'mongodb';
import { WebhookEventRecord, WebhookEventRecordSchema } from '@snapprint/contracts';

export const WEBHOOK_EVENTS_COLLECTION = 'webhook_events';

export type WebhookStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export interface WebhookEventDocument {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookStatus;
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface RecordWebhookResult {
  isNew: boolean;
  alreadyProcessed: boolean;
}

export async function findWebhookEvent(
  db: Db,
  eventId: string
): Promise<WebhookEventDocument | null> {
  return db.collection<WebhookEventDocument>(WEBHOOK_EVENTS_COLLECTION).findOne({ eventId });
}

export async function hasWebhookEvent(db: Db, eventId: string): Promise<boolean> {
  const count = await db
    .collection<WebhookEventDocument>(WEBHOOK_EVENTS_COLLECTION)
    .countDocuments({ eventId });
  return count > 0;
}

export async function recordWebhookEvent(
  db: Db,
  event: WebhookEventRecord
): Promise<RecordWebhookResult> {
  const parsed = WebhookEventRecordSchema.parse(event);
  const existing = await findWebhookEvent(db, parsed.eventId);
  if (existing) {
    return {
      isNew: false,
      alreadyProcessed: existing.status === 'PROCESSED',
    };
  }

  const doc: WebhookEventDocument = {
    eventId: parsed.eventId,
    eventType: parsed.eventType,
    payload: parsed.payload,
    status: 'PENDING',
    receivedAt: new Date(),
  };

  try {
    await db.collection<WebhookEventDocument>(WEBHOOK_EVENTS_COLLECTION).insertOne(doc);
    return { isNew: true, alreadyProcessed: false };
  } catch {
    const retry = await findWebhookEvent(db, parsed.eventId);
    return {
      isNew: false,
      alreadyProcessed: retry?.status === 'PROCESSED',
    };
  }
}

export async function updateWebhookEventStatus(
  db: Db,
  eventId: string,
  status: WebhookStatus,
  error?: string
): Promise<boolean> {
  const update: { status: WebhookStatus; processedAt?: Date; error?: string } = {
    status,
    processedAt: status === 'PROCESSED' ? new Date() : undefined,
  };
  if (error) {
    update.error = error;
  }
  const result = await db
    .collection<WebhookEventDocument>(WEBHOOK_EVENTS_COLLECTION)
    .updateOne({ eventId }, { $set: update });
  return result.matchedCount > 0;
}
