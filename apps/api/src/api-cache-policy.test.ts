import { describe, expect, it } from 'vitest';
import { createTestApp, seedTestStudio } from './auth-test-helper.js';

describe('HTTP Cache Policy Regression Tests (PR-1)', () => {
  it('enforces private, no-store anti-caching on authenticated API routes', async () => {
    const ctx = await createTestApp();
    const { studioId, cookies } = await seedTestStudio(ctx);
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const endpoints = [
      { method: 'GET' as const, url: `/studios/${studioId}`, headers: { cookie: cookieHeader, 'x-studio-id': studioId } },
      { method: 'GET' as const, url: `/studios/${studioId}/orders`, headers: { cookie: cookieHeader, 'x-studio-id': studioId } },
      { method: 'GET' as const, url: `/studios/${studioId}/printers`, headers: { cookie: cookieHeader, 'x-studio-id': studioId } },
      { method: 'GET' as const, url: '/auth/me', headers: { cookie: cookieHeader } },
    ];

    for (const ep of endpoints) {
      const res = await ctx.app.inject({
        method: ep.method,
        url: ep.url,
        headers: ep.headers,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['cache-control']).toBe(
        'private, no-cache, no-store, must-revalidate, max-age=0'
      );
    }
  });

  it('enforces real-time revalidation on public storefront endpoints', async () => {
    const ctx = await createTestApp();
    const { studioId } = await seedTestStudio(ctx);
    const slug = studioId.replace(/_/g, '-') + '-slug';

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/public/studios/${slug}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe(
      'public, no-cache, must-revalidate, max-age=0'
    );
  });
});
