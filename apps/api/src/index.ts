import fastify from 'fastify';
import { healthRoutes } from './health.js';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const app = fastify({
  logger: {
    level:
      (process.env.LOG_LEVEL as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace') || 'info',
  },
});

app.register(healthRoutes);

app.setErrorHandler((error, request, reply) => {
  const err = error as { statusCode?: number; message?: string };
  app.log.error(err);
  const statusCode = err.statusCode || 500;
  reply.status(statusCode).send({ error: 'internal server error' });
});

const signals = ['SIGINT', 'SIGTERM'] as const;

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, host: HOST }, 'snapprint api started');
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
    } catch (error) {
      app.log.error(error, 'error during shutdown');
      process.exit(1);
    }
    process.exit(0);
  });
}

start();
