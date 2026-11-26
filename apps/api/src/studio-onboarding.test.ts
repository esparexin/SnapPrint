import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Studio Onboarding & Lifecycle API (apps/api)', () => {
  async function seedOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_1';

    ctx.users.push({
      id: userId,
      email: 'owner@example.com',
      name: 'Ramesh Kumar',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, cookie };
  }

  it('POST /studios rejects unauthenticated requests', async () => {
    const { app } = await seedOwner();
    const res = await app.inject({
      method: 'POST',
      url: '/studios',
      payload: {
        name: 'Ramesh Xerox',
        slug: 'ramesh-xerox',
        location: { city: 'Hyderabad' },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /studios rejects invalid or reserved slugs', async () => {
    const { app, cookie } = await seedOwner();
    const res = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'Ramesh Xerox',
        slug: 'admin',
        location: { city: 'Hyderabad' },
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('INVALID_SLUG');
  });

  it('POST /studios successfully creates a shop in onboarding status and assigns studio_owner role', async () => {
    const { app, cookie, userId, studios, memberships } = await seedOwner();
    const res = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'Ramesh Xerox Point',
        slug: 'ramesh-xerox-point',
        location: { city: 'Hyderabad', state: 'Telangana', pincode: '500038' },
        capabilities: { autoPrintMaxPages: 40 },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe('Ramesh Xerox Point');
    expect(body.slug).toBe('ramesh-xerox-point');
    expect(body.status).toBe('onboarding');
    expect(body.capabilities.autoPrintMaxPages).toBe(40);

    expect(studios.some((s) => s.slug === 'ramesh-xerox-point')).toBe(true);
    expect(
      memberships.some(
        (m) => m.userId === userId && m.studioId === body.id && m.role === 'studio_owner'
      )
    ).toBe(true);
  });

  it('POST /studios rejects duplicate slugs with 409 Conflict', async () => {
    const { app, cookie } = await seedOwner();
    const payload = {
      name: 'Ramesh Xerox',
      slug: 'ramesh-duplicate',
      location: { city: 'Hyderabad' },
    };

    const first = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload,
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload,
    });
    expect(second.statusCode).toBe(409);
    const body = JSON.parse(second.body);
    expect(body.code).toBe('SLUG_ALREADY_EXISTS');
  });

  it('GET /studios/me returns the owner studios with computed activation readiness', async () => {
    const { app, cookie } = await seedOwner();
    await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'My Shop',
        slug: 'my-shop-ready',
        location: { city: 'Warangal' },
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/studios/me',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.studios).toHaveLength(1);
    expect(body.studios[0].name).toBe('My Shop');
    expect(body.studios[0].readiness.canActivate).toBe(true);
  });

  it('PATCH /studios/:studioId updates capabilities and autoPrintMaxPages', async () => {
    const { app, cookie } = await seedOwner();
    const createRes = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'Shop Setting',
        slug: 'shop-setting',
        location: { city: 'Hyderabad' },
      },
    });
    const studio = JSON.parse(createRes.body);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studio.id}`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        capabilities: {
          autoPrintMaxPages: 50,
          isAutoPrintEnabled: true,
          supportsColor: false,
          supportsBlackAndWhite: true,
          supportedPaperSizes: ['A4'],
        },
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const updated = JSON.parse(patchRes.body);
    expect(updated.capabilities.autoPrintMaxPages).toBe(50);
    expect(updated.capabilities.supportsColor).toBe(false);
  });

  it('POST /studios/:studioId/verify-razorpay confirms test credentials and enables online payments', async () => {
    const { app, cookie } = await seedOwner();
    const createRes = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'Razorpay Shop',
        slug: 'razorpay-shop',
        location: { city: 'Hyderabad' },
      },
    });
    const studio = JSON.parse(createRes.body);

    const verifyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studio.id}/verify-razorpay`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        keyId: 'rzp_test_validkey',
        keySecret: 'secret_12345678',
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const body = JSON.parse(verifyRes.body);
    expect(body.isConfirmed).toBe(true);

    const getRes = await app.inject({
      method: 'GET',
      url: `/studios/${studio.id}`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(getRes.statusCode).toBe(200);
    const fetched = JSON.parse(getRes.body);
    expect(fetched.studio.payment?.isRazorpayConfirmed).toBe(true);
    expect(fetched.studio.payment?.razorpayKeyId).toBe('rzp_test_validkey');
  });

  it('POST /studios/:studioId/activate transitions shop to active when ready', async () => {
    const { app, cookie } = await seedOwner();
    const createRes = await app.inject({
      method: 'POST',
      url: '/studios',
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        name: 'Active Ready Shop',
        slug: 'active-ready-shop',
        location: { city: 'Nizamabad' },
      },
    });
    const studio = JSON.parse(createRes.body);

    const activateRes = await app.inject({
      method: 'POST',
      url: `/studios/${studio.id}/activate`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        confirmReady: true,
      },
    });

    expect(activateRes.statusCode).toBe(200);
    const body = JSON.parse(activateRes.body);
    expect(body.status).toBe('active');
    expect(body.publicUrl).toBe('/s/active-ready-shop');
  });
});
