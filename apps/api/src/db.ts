import { Db, MongoClient } from 'mongodb';

let clientInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function connectDb(
  uri: string,
  dbName: string
): Promise<{ client: MongoClient; db: Db }> {
  if (clientInstance && dbInstance) {
    return { client: clientInstance, db: dbInstance };
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(dbName);

  clientInstance = client;
  dbInstance = db;

  await ensureIndexes(db);

  return { client, db };
}

export function getDb(): Db {
  if (!dbInstance) {
    throw new Error('Database not connected. Call connectDb() first.');
  }
  return dbInstance;
}

export function getClient(): MongoClient | null {
  return clientInstance;
}

export async function closeDb(): Promise<void> {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}

export async function ensureIndexes(db: Db): Promise<void> {
  // 1. Studios collection: immutable studio ID and unique public slug
  await db.collection('studios').createIndexes([
    { key: { id: 1 }, unique: true, name: 'uid_studio_id' },
    { key: { slug: 1 }, unique: true, name: 'uid_studio_slug' },
    { key: { status: 1 }, name: 'idx_studio_status' },
  ]);

  // 2. User memberships: compound unique on user + studio
  await db.collection('user_memberships').createIndexes([
    { key: { userId: 1, studioId: 1 }, unique: true, name: 'uid_user_studio_membership' },
    { key: { studioId: 1 }, name: 'idx_membership_studio' },
  ]);

  // 3. Customer QR sessions: unique session ID, tenant scoping, and auto-cleanup TTL
  await db.collection('qr_sessions').createIndexes([
    { key: { sessionId: 1 }, unique: true, name: 'uid_session_id' },
    { key: { studioId: 1 }, name: 'idx_qr_session_studio' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_qr_session_expiry' },
  ]);

  // 4. Photo assets: unique asset ID and compound index for studio session scoping
  await db.collection('photo_assets').createIndexes([
    { key: { assetId: 1 }, unique: true, name: 'uid_asset_id' },
    { key: { studioId: 1, sessionId: 1 }, name: 'idx_asset_studio_session' },
  ]);

  // 5. Users collection: unique ID and unique normalized email
  await db.collection('users').createIndexes([
    { key: { id: 1 }, unique: true, name: 'uid_user_id' },
    { key: { email: 1 }, unique: true, name: 'uid_user_email' },
  ]);

  // 6. Operator sessions collection: unique session ID, user-status scoping, and TTL auto-cleanup
  await db.collection('operator_sessions').createIndexes([
    { key: { sessionId: 1 }, unique: true, name: 'uid_operator_session_id' },
    { key: { userId: 1, status: 1 }, name: 'idx_operator_session_user_status' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_operator_session_expiry' },
  ]);

  // 7. Orders collection: studio queue ordering, unique order ID, and idempotency
  await db.collection('orders').createIndexes([
    { key: { studioId: 1, createdAt: -1 }, name: 'idx_order_studio_created' },
    { key: { studioId: 1, orderId: 1 }, unique: true, name: 'uid_order_studio_id' },
    { key: { studioId: 1, idempotencyKey: 1 }, unique: true, name: 'uid_order_studio_idempotency' },
  ]);

  // 8. Payments collection: studio order payment history and unique payment ID
  await db.collection('payments').createIndexes([
    { key: { studioId: 1, orderId: 1, createdAt: 1 }, name: 'idx_payment_studio_order_created' },
    { key: { studioId: 1, paymentId: 1 }, unique: true, name: 'uid_payment_studio_id' },
    { key: { gatewayOrderId: 1 }, sparse: true, name: 'idx_payment_gateway_order' },
  ]);

  // 9. Webhook events collection: unique eventId for idempotent replay prevention
  await db
    .collection('webhook_events')
    .createIndexes([{ key: { eventId: 1 }, unique: true, name: 'uid_webhook_event_id' }]);
}
