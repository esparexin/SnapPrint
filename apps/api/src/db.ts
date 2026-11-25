import { Db, MongoClient } from 'mongodb';

let clientInstance: MongoClient | null = null;
let dbInstance: Db | null = null;

export const MONGO_CLIENT_OPTIONS = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  ignoreUndefined: true,
} as const;

export async function connectDb(
  uri: string,
  dbName: string
): Promise<{ client: MongoClient; db: Db }> {
  if (clientInstance && dbInstance) {
    return { client: clientInstance, db: dbInstance };
  }

  const client = new MongoClient(uri, MONGO_CLIENT_OPTIONS);

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

  // 10. Email OTPs collection: unique ID, active lookup, and auto-cleanup TTL
  await db.collection('email_otps').createIndexes([
    { key: { id: 1 }, unique: true, name: 'uid_email_otp_id' },
    { key: { email: 1, intent: 1, status: 1 }, name: 'idx_email_otp_email_intent_status' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_email_otp_expiry' },
  ]);

  // 11. Print jobs: studio queue polling, unique job ID, and order association
  await db.collection('print_jobs').createIndexes([
    { key: { studioId: 1, status: 1, createdAt: 1 }, name: 'idx_print_jobs_studio_status_created' },
    { key: { jobId: 1 }, unique: true, name: 'uid_print_job_id' },
    { key: { orderId: 1 }, name: 'idx_print_jobs_order' },
    { key: { studioId: 1, claimedByDeviceId: 1 }, name: 'idx_print_jobs_device_claim' },
  ]);

  // 12. Agent devices: unique token lookup, studio fleet listing, and heartbeat tracking
  await db.collection('agent_devices').createIndexes([
    { key: { deviceToken: 1 }, unique: true, name: 'uid_agent_device_token' },
    { key: { deviceId: 1 }, unique: true, name: 'uid_agent_device_id' },
    { key: { studioId: 1, status: 1 }, name: 'idx_agent_device_studio_status' },
    { key: { lastHeartbeatAt: 1 }, name: 'idx_agent_device_heartbeat' },
  ]);

  // 13. Studio printers: unique printer per studio and active status lookup
  await db.collection('studio_printers').createIndexes([
    { key: { studioId: 1, id: 1 }, unique: true, name: 'uid_studio_printer_id' },
    { key: { studioId: 1, role: 1, status: 1 }, name: 'idx_studio_printer_role_status' },
  ]);

  // 14. Subscriptions collection: one subscription record per studio
  await db
    .collection('subscriptions')
    .createIndexes([{ key: { studioId: 1 }, unique: true, name: 'uid_subscription_studio_id' }]);

  // 15. Subscription orders: gateway order/payment idempotency and history
  await db.collection('subscription_orders').createIndexes([
    { key: { gatewayOrderId: 1 }, unique: true, name: 'uid_sub_order_gateway_order' },
    {
      key: { gatewayPaymentId: 1 },
      unique: true,
      sparse: true,
      name: 'uid_sub_order_gateway_payment',
    },
    { key: { studioId: 1, createdAt: -1 }, name: 'idx_sub_order_studio_created' },
  ]);
}
