import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Studio Tenant Authorization & Anti-Tampering', () => {
  async function seedOperatorWithStudio() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');

    ctx.users.push({
      id: 'user_owner_a',
      email: 'owner-a@example.com',
      name: 'Owner A',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: 'studio_alpha',
      slug: 'studio-alpha',
      name: 'Alpha Studio',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: 'studio_beta',
      slug: 'studio-beta',
      name: 'Beta Studio',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId: 'user_owner_a',
      studioId: 'studio_alpha',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner-a@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, cookie };
  }

  it('GET /studios/:studioId rejects unauthenticated requests', async () => {
    const { app } = await seedOperatorWithStudio();
    const res = await app.inject({ method: 'GET', url: '/studios/studio_alpha' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('GET /studios/:studioId detects conflicting tenant header and route parameter', async () => {
    const { app, cookie } = await seedOperatorWithStudio();

    const res = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      headers: { 'x-studio-id': 'studio_beta' },
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe('TENANT_ID_CONFLICT');
    await app.close();
  });

  it('GET /studios/:studioId rejects cross-studio access attempt by member of another studio', async () => {
    const { app, cookie } = await seedOperatorWithStudio();

    // Owner of Studio Alpha attempts to access Studio Beta
    const res = await app.inject({
      method: 'GET',
      url: '/studios/studio_beta',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('UNAUTHORIZED_STUDIO_ACCESS');
    await app.close();
  });

  it('GET /studios/:studioId rejects access when studio membership is suspended', async () => {
    const { app, cookie, memberships } = await seedOperatorWithStudio();

    memberships[0].status = 'suspended';

    const res = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('MEMBERSHIP_INACTIVE');
    await app.close();
  });

  it('GET /studios/:studioId rejects access when studio itself is suspended or closed', async () => {
    const { app, cookie, studios } = await seedOperatorWithStudio();

    studios[0].status = 'suspended';

    const resSuspended = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(resSuspended.statusCode).toBe(403);
    expect(JSON.parse(resSuspended.payload).code).toBe('STUDIO_SUSPENDED');

    studios[0].status = 'closed';
    const resClosed = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(resClosed.statusCode).toBe(403);
    expect(JSON.parse(resClosed.payload).code).toBe('STUDIO_CLOSED');

    await app.close();
  });

  it('GET /operator/studios returns list of studios accessible to the authenticated operator', async () => {
    const { app, cookie } = await seedOperatorWithStudio();

    const res = await app.inject({
      method: 'GET',
      url: '/operator/studios',
      cookies: { [cookie.name]: cookie.value },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveLength(1);
    expect(body[0].studio.id).toBe('studio_alpha');
    expect(body[0].role).toBe('studio_owner');

    await app.close();
  });
});
