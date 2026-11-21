import { FastifyPluginAsync } from 'fastify';
import { getClient } from './db.js';

interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database?: 'connected' | 'disconnected' | 'disabled';
}

const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness probe: reports if process is running
  app.get('/health', async () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'snapprint-api',
    };
    return response;
  });

  // Readiness probe: verifies downstream database connectivity
  app.get('/ready', async (request, reply) => {
    const client = getClient();
    if (!client) {
      // If no database configured (e.g. running without persistent backend)
      return {
        status: 'ok',
        service: 'snapprint-api',
        database: 'disabled',
      };
    }

    try {
      await client.db('admin').admin().ping();
      return {
        status: 'ok',
        service: 'snapprint-api',
        database: 'connected',
      };
    } catch (err) {
      app.log.error(err, 'Database readiness check failed');
      return reply.status(503).send({
        status: 'degraded',
        service: 'snapprint-api',
        database: 'disconnected',
      });
    }
  });
};

export { healthRoutes };
