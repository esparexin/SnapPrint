import { describe, expect, it } from 'vitest';
import { Db, IndexDescription } from 'mongodb';
import { ensureIndexes, getClient, getDb } from './db.js';

describe('Database Indexes & Connection State', () => {
  it('throws descriptive error when getDb() is called before connectDb()', () => {
    expect(() => getDb()).toThrow('Database not connected. Call connectDb() first.');
  });

  it('getClient() returns null when not connected', () => {
    expect(getClient()).toBeNull();
  });

  it('ensureIndexes creates all required collection indexes including users and operator_sessions', async () => {
    const createdIndexes: Record<string, IndexDescription[]> = {};

    const mockDb = {
      collection: (name: string) => ({
        createIndexes: async (indexes: IndexDescription[]) => {
          createdIndexes[name] = indexes;
          return indexes.map((i) => i.name ?? 'index');
        },
      }),
    } as unknown as Db;

    await ensureIndexes(mockDb);

    // Verify users collection indexes
    expect(createdIndexes['users']).toBeDefined();
    expect(createdIndexes['users']).toHaveLength(2);
    expect(createdIndexes['users']).toContainEqual({
      key: { id: 1 },
      unique: true,
      name: 'uid_user_id',
    });
    expect(createdIndexes['users']).toContainEqual({
      key: { email: 1 },
      unique: true,
      name: 'uid_user_email',
    });

    // Verify operator_sessions collection indexes
    expect(createdIndexes['operator_sessions']).toBeDefined();
    expect(createdIndexes['operator_sessions']).toHaveLength(3);
    expect(createdIndexes['operator_sessions']).toContainEqual({
      key: { sessionId: 1 },
      unique: true,
      name: 'uid_operator_session_id',
    });
    expect(createdIndexes['operator_sessions']).toContainEqual({
      key: { userId: 1, status: 1 },
      name: 'idx_operator_session_user_status',
    });
    expect(createdIndexes['operator_sessions']).toContainEqual({
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
      name: 'ttl_operator_session_expiry',
    });

    // Verify existing collections remain untouched
    expect(createdIndexes['studios']).toBeDefined();
    expect(createdIndexes['user_memberships']).toBeDefined();
    expect(createdIndexes['qr_sessions']).toBeDefined();
    expect(createdIndexes['photo_assets']).toBeDefined();

    // Verify orders, payments, and webhook_events indexes
    expect(createdIndexes['orders']).toBeDefined();
    expect(createdIndexes['orders']).toContainEqual({
      key: { studioId: 1, createdAt: -1 },
      name: 'idx_order_studio_created',
    });
    expect(createdIndexes['payments']).toBeDefined();
    expect(createdIndexes['payments']).toContainEqual({
      key: { studioId: 1, orderId: 1, createdAt: 1 },
      name: 'idx_payment_studio_order_created',
    });
    expect(createdIndexes['webhook_events']).toBeDefined();
    expect(createdIndexes['webhook_events']).toContainEqual({
      key: { eventId: 1 },
      unique: true,
      name: 'uid_webhook_event_id',
    });
  });
});
