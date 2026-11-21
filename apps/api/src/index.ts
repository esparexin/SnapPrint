import fastify from 'fastify';
import { loadConfig } from './config.js';
import { closeDb, connectDb } from './db.js';
import { handleApiError } from './error-handler.js';
import { healthRoutes } from './health.js';
import { sessionPlugin } from './plugins/session.js';
import { tenantPlugin } from './plugins/tenant.js';

const config = loadConfig();

const app = fastify({
  logger: {
    level: config.logLevel,
  },
});

app.setErrorHandler(handleApiError);

app.register(tenantPlugin);
app.register(sessionPlugin, { sessionSecret: config.sessionSecret });
app.register(healthRoutes);

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
