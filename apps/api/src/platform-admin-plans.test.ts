import { describe, expect, it } from 'vitest';
import { seedPlatformEnvironment } from './platform-admin-test-helper.js';

describe('Platform Admin Plans & Notification Routes', () => {
  it('rejects unauthenticated requests to /admin/plans with 401', async () => {
    const { app } = await seedPlatformEnvironment();
    const res = await app.inject({ method: 'GET', url: '/admin/plans' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('rejects non-platform-admin operators from /admin/plans with 403', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const cookie = await login('owner@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/admin/plans',
      cookies: { [cookie.name]: cookie.value },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('lists default seeded plans for platform_admin', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const res = await app.inject({
      method: 'GET',
      url: '/admin/plans',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.plans.length).toBeGreaterThanOrEqual(4);
    const freePlan = body.plans.find((p: { id: string }) => p.id === 'free');
    expect(freePlan).toBeDefined();
    expect(freePlan.durationDays).toBe(30);
    expect(freePlan.priceRupees).toBe(0);
    await app.close();
  });

  it('allows platform_admin to create, update, and delete a custom plan', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    // 1. Create a 31-day promotional plan
    const createRes = await app.inject({
      method: 'POST',
      url: '/admin/plans',
      cookies: { [adminCookie.name]: adminCookie.value },
      payload: {
        id: 'promo_31',
        name: 'Promo 31-Day Plan',
        durationDays: 31,
        priceRupees: 299,
        category: 'paid',
        intervalMonths: 1,
        description: 'Special 31-day partner tier',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const createdBody = JSON.parse(createRes.payload);
    expect(createdBody.plan.id).toBe('promo_31');
    expect(createdBody.plan.durationDays).toBe(31);

    // 2. Update to 32 days and price 349
    const updateRes = await app.inject({
      method: 'PUT',
      url: '/admin/plans/promo_31',
      cookies: { [adminCookie.name]: adminCookie.value },
      payload: {
        durationDays: 32,
        priceRupees: 349,
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updatedBody = JSON.parse(updateRes.payload);
    expect(updatedBody.plan.durationDays).toBe(32);
    expect(updatedBody.plan.priceRupees).toBe(349);

    // 3. Delete the plan
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/admin/plans/promo_31',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(deleteRes.statusCode).toBe(200);

    // 4. Verify 404 on update after delete
    const reUpdateRes = await app.inject({
      method: 'PUT',
      url: '/admin/plans/promo_31',
      cookies: { [adminCookie.name]: adminCookie.value },
      payload: { priceRupees: 500 },
    });
    expect(reUpdateRes.statusCode).toBe(404);

    await app.close();
  });

  it('triggers and queues a subscription notification with audit log', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const res = await app.inject({
      method: 'POST',
      url: '/admin/studios/studio_one/subscription/notify',
      cookies: { [adminCookie.name]: adminCookie.value },
      payload: {
        type: 'expiry_reminder',
        message: 'Your 30-day trial is nearing expiration.',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.queued).toBe(true);
    expect(body.studioId).toBe('studio_one');

    await app.close();
  });
});
