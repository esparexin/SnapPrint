import fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { assetRoutes } from './asset-routes.js';
import { authRoutes } from './auth.js';
import { AppConfig } from './config.js';
import { createMockDb, MockCollections } from './mock-db.js';
import { orderRoutes } from './order-routes.js';
import { MockPaymentGatewayService, PaymentGatewayService } from './payment/gateway-service.js';
import { paymentRoutes } from './payment-routes.js';
import { operatorPaymentRoutes } from './payment-routes-operator.js';
import { publicRoutes } from './public-routes.js';
import { studioRoutes } from './studio-routes.js';
import { webhookRoutes } from './webhook-routes.js';
import { MemoryStorageService, StorageService } from './storage/storage-service.js';

export interface TestAuthContext extends MockCollections {
  app: FastifyInstance;
  db: ReturnType<typeof createMockDb>['db'];
  storage: StorageService;
  gateway: PaymentGatewayService;
}

export async function createTestApp(
  configOverrides?: Partial<AppConfig>,
  gatewayOverride?: PaymentGatewayService
): Promise<TestAuthContext> {
  const mock = createMockDb();
  const storage = new MemoryStorageService();
  const gateway = gatewayOverride ?? new MockPaymentGatewayService();

  const testConfig: AppConfig = {
    port: 3001,
    host: '127.0.0.1',
    nodeEnv: 'development',
    mongoUri: 'mongodb://localhost:27017',
    mongoDbName: 'snapprint',
    logLevel: 'fatal',
    sessionSecret: 'test-session-secret-at-least-32-chars-long!',
    cookieSecret: 'test-cookie-secret-at-least-32-chars-long!',
    corsAllowedOrigins: 'http://localhost:3000,https://studio.snapprint.com',
    trustProxy: false,
    cookieSecure: false,
    rateLimitMax: 100,
    rateLimitTimeWindow: '1 minute',
    ...configOverrides,
  };

  const app = fastify();
  await app.register(fastifyCookie, { secret: testConfig.cookieSecret });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(authRoutes, { db: mock.db, config: testConfig });
  await app.register(studioRoutes, { db: mock.db });
  await app.register(publicRoutes, { db: mock.db, config: testConfig });
  await app.register(assetRoutes, { db: mock.db, config: testConfig, storage });
  await app.register(orderRoutes, { db: mock.db, config: testConfig, storage });
  await app.register(paymentRoutes, { db: mock.db, config: testConfig, gateway });
  await app.register(operatorPaymentRoutes, { db: mock.db });
  await app.register(webhookRoutes, { db: mock.db, config: testConfig, gateway });
  await app.ready();

  return {
    app,
    db: mock.db,
    users: mock.users,
    sessions: mock.sessions,
    qrSessions: mock.qrSessions,
    photoAssets: mock.photoAssets,
    memberships: mock.memberships,
    studios: mock.studios,
    orders: mock.orders,
    payments: mock.payments,
    webhookEvents: mock.webhookEvents,
    storage,
    gateway,
  };
}
