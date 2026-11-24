import { describe, expect, it } from 'vitest';
import { seedPlatformEnvironment } from './platform-admin-test-helper.js';

describe('Platform Admin Routes & Authorization', () => {
  it('rejects unauthenticated requests to /admin endpoints with 401', async () => {
    const { app } = await seedPlatformEnvironment();
    const res = await app.inject({ method: 'GET', url: '/admin/metrics' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('rejects non-platform-admin operators with 403', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const cookie = await login('owner@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/admin/metrics',
      cookies: { [cookie.name]: cookie.value },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('PLATFORM_ADMIN_REQUIRED');
    await app.close();
  });

  it('returns platform-wide metrics for platform_admin', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const res = await app.inject({
      method: 'GET',
      url: '/admin/metrics',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(res.statusCode).toBe(200);
    const metrics = JSON.parse(res.payload);
    expect(metrics.totalStudios).toBe(2);
    expect(metrics.activeStudios).toBe(1);
    expect(metrics.onboardingStudios).toBe(1);
    expect(metrics.totalPaidVolumeMinor).toBe(25000);
    await app.close();
  });

  it('lists studios with search and status filtering', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const listRes = await app.inject({
      method: 'GET',
      url: '/admin/studios?search=two',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.payload);
    expect(body.studios.length).toBe(1);
    expect(body.studios[0].id).toBe('studio_two');

    const allRes = await app.inject({
      method: 'GET',
      url: '/admin/studios',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    const allBody = JSON.parse(allRes.payload);
    const studioOne = allBody.studios.find((s: { id: string }) => s.id === 'studio_one');
    expect(studioOne).toBeDefined();
    expect(studioOne.printerCount).toBe(1);
    expect(studioOne.payment?.enableCounterPayment).toBe(true);
    expect(studioOne.payment?.enableOnlinePayment).toBe(true);
    await app.close();
  });

  it('updates studio status and creates immutable audit log', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/admin/studios/studio_one/status',
      payload: {
        status: 'suspended',
        reason: 'Policy non-compliance regarding counter billing',
      },
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.payload);
    expect(patchBody.studio.status).toBe('suspended');

    const auditRes = await app.inject({
      method: 'GET',
      url: '/admin/audit-logs',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(auditRes.statusCode).toBe(200);
    const auditBody = JSON.parse(auditRes.payload);
    expect(auditBody.auditLogs.length).toBeGreaterThanOrEqual(1);
    const log = auditBody.auditLogs[0];
    expect(log.targetId).toBe('studio_one');
    expect(log.action).toBe('studio.status_change');
    expect(log.reason).toBe('Policy non-compliance regarding counter billing');
    expect(log.actorId).toBe('admin_user');
    await app.close();
  });

  it('lists registered users and their RBAC roles for platform admin', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const usersRes = await app.inject({
      method: 'GET',
      url: '/admin/users',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(usersRes.statusCode).toBe(200);
    const body = JSON.parse(usersRes.payload);
    expect(body.users.length).toBeGreaterThanOrEqual(2);
    expect(body.users.some((u: { role: string }) => u.role === 'platform_admin')).toBe(true);
    expect(body.users.some((u: { role: string }) => u.role === 'studio_owner')).toBe(true);
    await app.close();
  });

  it('POST /admin/users creates a new platform admin user and audit log', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const res = await app.inject({
      method: 'POST',
      url: '/admin/users',
      payload: { email: 'newadmin@snapprint.in', name: 'New Superadmin' },
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('platform_admin');
    expect(body.user.email).toBe('newadmin@snapprint.in');

    // Verify self-suspension guard
    const selfRes = await app.inject({
      method: 'PATCH',
      url: '/admin/users/admin_user/status',
      payload: { status: 'suspended' },
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(selfRes.statusCode).toBe(400);
    expect(JSON.parse(selfRes.payload).code).toBe('SELF_SUSPENSION_PREVENTED');
    await app.close();
  });

  it('GET /admin/studios/:id/details returns complete studio, owner and printer fleet', async () => {
    const { app, login } = await seedPlatformEnvironment();
    const adminCookie = await login('superadmin@snapprint.in');

    const res = await app.inject({
      method: 'GET',
      url: '/admin/studios/studio_one/details',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.studio.id).toBe('studio_one');
    expect(body.studio.currency).toBe('INR');
    expect(body.studio.printerCount).toBe(1);
    expect(body.studio.payment?.enableCounterPayment).toBe(true);
    expect(body.subscription).toBeDefined();
    expect(body.subscription.plan).toBe('quarterly');
    expect(body.subscription.status).toBe('active');
    expect(Array.isArray(body.printers)).toBe(true);
    expect(body.printers).toHaveLength(1);
    expect(Array.isArray(body.devices)).toBe(true);
    expect(body.printStats).toBeDefined();
    expect(body.printStats.totalCompletedPrints).toBeGreaterThanOrEqual(0);
    expect(body.printStats.colorPrints).toBeGreaterThanOrEqual(0);
    expect(body.printStats.bwPrints).toBeGreaterThanOrEqual(0);
    await app.close();
  });
});
