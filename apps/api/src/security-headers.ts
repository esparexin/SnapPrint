import { FastifyInstance } from 'fastify';

/**
 * Attaches standard security and anti-cache HTTP response headers.
 * Protects downstream browsers and intermediate proxies from stale caching.
 */
export function registerSecurityAndCacheHeaders(
  app: FastifyInstance,
  nodeEnv = 'development'
): void {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (nodeEnv === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    if (!reply.hasHeader('cache-control')) {
      reply.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    }
  });
}
