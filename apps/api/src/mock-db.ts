import { Db } from 'mongodb';
import { UserMembershipDocument } from './repositories/membership.repository.js';
import { OperatorSessionDocument } from './repositories/operator-session.repository.js';
import { EmailOtpDocument } from './repositories/otp.repository.js';
import { OrderDocument } from './repositories/order.repository.js';
import { PaymentDocument } from './repositories/payment.repository.js';
import { PhotoAssetDocument } from './repositories/photo-asset.repository.js';
import { QrSessionDocument } from './repositories/session.repository.js';
import { StudioDocument } from './repositories/studio.repository.js';
import { UserDocument } from './repositories/user.repository.js';
import { WebhookEventDocument } from './repositories/webhook.repository.js';

export interface MockCollections {
  users: UserDocument[];
  sessions: OperatorSessionDocument[];
  qrSessions: QrSessionDocument[];
  photoAssets: PhotoAssetDocument[];
  memberships: UserMembershipDocument[];
  studios: StudioDocument[];
  orders: OrderDocument[];
  payments: PaymentDocument[];
  webhookEvents: WebhookEventDocument[];
  emailOtps: EmailOtpDocument[];
  auditLogs?: Record<string, unknown>[];
}

function toComparableNumber(val: unknown): number {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string' && !Number.isNaN(Date.parse(val))) return new Date(val).getTime();
  return typeof val === 'number' ? val : NaN;
}

function matchComparisonOp(actual: unknown, op: string, target: unknown): boolean {
  const a = toComparableNumber(actual);
  const b = toComparableNumber(target);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (op === '$gt') return a > b;
  if (op === '$gte') return a >= b;
  if (op === '$lt') return a < b;
  if (op === '$lte') return a <= b;
  return false;
}

function matchDoc(item: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined) continue;
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      if ('$in' in obj && Array.isArray(obj.$in)) {
        if (!obj.$in.includes(item[k])) return false;
        continue;
      }
      let handledOp = false;
      for (const op of ['$gt', '$gte', '$lt', '$lte'] as const) {
        if (op in obj) {
          handledOp = true;
          if (!matchComparisonOp(item[k], op, obj[op])) return false;
        }
      }
      if (handledOp) continue;
    }
    if (item[k] !== v) {
      return false;
    }
  }
  return true;
}

function compareSortValues(left: unknown, right: unknown): number {
  const a = left instanceof Date ? left.getTime() : left;
  const b = right instanceof Date ? right.getTime() : right;

  if (a === b || (a == null && b == null)) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : 1;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : 1;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a ? 1 : -1;

  throw new TypeError('Mock database sort values must have matching scalar types');
}

export function createMockDb(): { db: Db } & MockCollections {
  const users: UserDocument[] = [];
  const sessions: OperatorSessionDocument[] = [];
  const qrSessions: QrSessionDocument[] = [];
  const photoAssets: PhotoAssetDocument[] = [];
  const memberships: UserMembershipDocument[] = [];
  const studios: StudioDocument[] = [];
  const orders: OrderDocument[] = [];
  const payments: PaymentDocument[] = [];
  const webhookEvents: WebhookEventDocument[] = [];
  const emailOtps: EmailOtpDocument[] = [];

  const store: Record<string, Record<string, unknown>[]> = {
    users: users as unknown as Record<string, unknown>[],
    operator_sessions: sessions as unknown as Record<string, unknown>[],
    qr_sessions: qrSessions as unknown as Record<string, unknown>[],
    photo_assets: photoAssets as unknown as Record<string, unknown>[],
    user_memberships: memberships as unknown as Record<string, unknown>[],
    studios: studios as unknown as Record<string, unknown>[],
    orders: orders as unknown as Record<string, unknown>[],
    payments: payments as unknown as Record<string, unknown>[],
    webhook_events: webhookEvents as unknown as Record<string, unknown>[],
    email_otps: emailOtps as unknown as Record<string, unknown>[],
  };

  const db = {
    collection: (name: string) => {
      const list = store[name] || (store[name] = []);
      return {
        async insertOne(doc: unknown) {
          const item = { ...(doc as Record<string, unknown>) };
          list.push(item);
          const id = (item.id ||
            item.sessionId ||
            item.orderId ||
            item.paymentId ||
            item.eventId) as string;
          return { acknowledged: true, insertedId: id };
        },
        async findOne(filter: Record<string, unknown>) {
          return list.find((i) => matchDoc(i, filter)) ?? null;
        },
        async updateOne(
          filter: Record<string, unknown>,
          update: { $set?: Record<string, unknown>; $inc?: Record<string, number> }
        ) {
          const item = list.find((i) => matchDoc(i, filter));
          if (!item) return { matchedCount: 0, modifiedCount: 0 };
          if (update.$set) Object.assign(item, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              item[k] = ((item[k] as number) ?? 0) + v;
            }
          }
          return { matchedCount: 1, modifiedCount: 1 };
        },
        async findOneAndUpdate(
          filter: Record<string, unknown>,
          update: {
            $set?: Record<string, unknown>;
            $inc?: Record<string, number>;
            $push?: Record<string, unknown>;
          }
        ) {
          const item = list.find((i) => matchDoc(i, filter));
          if (!item) return null;
          if (update.$set) Object.assign(item, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              item[k] = ((item[k] as number) ?? 0) + v;
            }
          }
          if (update.$push) {
            for (const [k, v] of Object.entries(update.$push)) {
              if (!Array.isArray(item[k])) item[k] = [];
              (item[k] as unknown[]).push(v);
            }
          }
          return { ...item };
        },
        find(filter: Record<string, unknown>) {
          const matched = list.filter((i) => matchDoc(i, filter));
          const cursor = {
            sort: (spec?: Record<string, 1 | -1>) => {
              if (spec) {
                const [key, dir] = Object.entries(spec)[0] ?? [];
                if (key) {
                  matched.sort((a, b) => {
                    return compareSortValues(a[key], b[key]) * (dir === -1 ? -1 : 1);
                  });
                }
              }
              return cursor;
            },
            skip: (n?: number) => {
              if (n !== undefined) matched.splice(0, n);
              return cursor;
            },
            limit: (n?: number) => {
              if (n !== undefined) matched.splice(n);
              return cursor;
            },
            toArray: async () => matched.map((i) => ({ ...i })),
          };
          return cursor;
        },
        async countDocuments(filter: Record<string, unknown>) {
          return list.filter((i) => matchDoc(i, filter)).length;
        },
        async deleteOne(filter: Record<string, unknown>) {
          const idx = list.findIndex((i) => matchDoc(i, filter));
          if (idx === -1) return { deletedCount: 0 };
          list.splice(idx, 1);
          return { deletedCount: 1 };
        },
        async updateMany(
          filter: Record<string, unknown>,
          update: { $set?: Record<string, unknown> }
        ) {
          const matched = list.filter((i) => matchDoc(i, filter));
          for (const item of matched) {
            if (update.$set) Object.assign(item, update.$set);
          }
          return { matchedCount: matched.length, modifiedCount: matched.length };
        },
        async createIndexes() {
          return [];
        },
      };
    },
  } as unknown as Db;

  return {
    db,
    users,
    sessions,
    qrSessions,
    photoAssets,
    memberships,
    studios,
    orders,
    payments,
    webhookEvents,
    emailOtps,
  };
}
