import { FastifyPluginAsync } from 'fastify';

interface HealthResponse {
  status: 'ok';
  service: string;
}

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'snapprint-api',
    };
    return response;
  });

  app.get('/ready', async () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'snapprint-api',
    };
    return response;
  });
};

export { healthRoutes };
