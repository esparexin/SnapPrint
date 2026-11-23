import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { assetRoutes } from './asset-routes.js';
import { authLoginOtpRoutes } from './auth-login-otp-routes.js';
import { authRegistrationRoutes } from './auth-registration-routes.js';
import { authRoutes } from './auth.js';
import { loadConfig } from './config.js';
import { closeDb, connectDb } from './db.js';
import { createEmailService } from './email/email-service.js';
import { handleApiError } from './error-handler.js';
import { healthRoutes } from './health.js';
import { orderRoutes } from './order-routes.js';
import { paymentRoutes } from './payment-routes.js';
import { operatorPaymentRoutes } from './payment-routes-operator.js';
import { publicRoutes } from './public-routes.js';
import { sessionPlugin } from './plugins/session.js';
import { tenantPlugin } from './plugins/tenant.js';
import { studioRoutes } from './studio-routes.js';
import { studioOnboardingRoutes } from './studio-onboarding-routes.js';
import { studioSettingsRoutes } from './studio-settings-routes.js';
import { studioWorkspaceRoutes } from './studio-workspace-routes.js';
import { printerRoutes } from './printer-routes.js';
import { platformAdminRoutes } from './platform-admin-routes.js';
import { webhookRoutes } from './webhook-routes.js';

const config = loadConfig();
const emailService = createEmailService(config);

const app = fastify({
  trustProxy: config.trustProxy,
  logger: {
    level: config.logLevel,
    redact: [
      'req.headers.authorization',
      'req.headers["x-session-token"]',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
    ],
  },
});

app.setErrorHandler(handleApiError);

app.register(cors, {
  origin: config.corsAllowedOrigins.split(',').map((origin) => origin.trim()),
  credentials: true,
});

app.register(rateLimit, {
  max: config.rateLimitMax,
  timeWindow: config.rateLimitTimeWindow,
  allowList: (req) => {
    return req.url === '/health' || req.url === '/ready';
  },
  errorResponseBuilder: (_req, context) => ({
    statusCode: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after}. Please try again later.`,
  }),
});

app.register(fastifyCookie, {
  secret: config.cookieSecret,
  hook: 'onRequest',
});

app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

app.register(tenantPlugin);
app.register(sessionPlugin, { sessionSecret: config.sessionSecret });
app.register(healthRoutes);
app.register(authRoutes);
app.register(authRegistrationRoutes, { emailService });
app.register(authLoginOtpRoutes, { emailService });
app.register(studioRoutes);
app.register(studioOnboardingRoutes);
app.register(studioSettingsRoutes);
app.register(studioWorkspaceRoutes);
app.register(printerRoutes);
app.register(publicRoutes);
app.register(assetRoutes);
app.register(orderRoutes);
app.register(paymentRoutes);
app.register(operatorPaymentRoutes);
app.register(platformAdminRoutes);
app.register(webhookRoutes);

const signals = ['SIGINT', 'SIGTERM'] as const;

async function start() {
  try {
    if (config.mongoUri) {
      app.log.info({ db: config.mongoDbName }, 'connecting to mongodb...');
      await connectDb(config.mongoUri, config.mongoDbName);
      app.log.info('mongodb connected and indexes ensured');
    } else {
      app.log.warn('MONGODB_URI not provided; starting without persistent database connection');
    }

    await app.listen({ port: config.port, host: config.host });
    app.log.info({ port: config.port, host: config.host }, 'snapprint api started');
  } catch (error) {
    app.log.error(error, 'failed to start api');
    process.exit(1);
  }
}

for (const signal of signals) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      await closeDb();
    } catch (error) {
      app.log.error(error, 'error during shutdown');
      process.exit(1);
    }
    process.exit(0);
  });
}

start();
