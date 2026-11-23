import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Platform Admin Routes & Authorization', () => {
  async function seedPlatformEnvironment() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');

    // Admin user
    ctx.users.push({
      id: 'admin_user',
      email: 'superadmin@snapprint.in',
      name: 'Super Admin',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
      updatedAt: new Date('2026-11-20T10:00:00.000Z'),
    });
    ctx.memberships.push({
      userId: 'admin_user',
      studioId: null,
      role: 'platform_admin',
      status: 'active',
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
    });

    // Regular studio owner
    ctx.users.push({
      id: 'owner_user',
      email: 'owner@example.com',
      name: 'Shop Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
      updatedAt: new Date('2026-11-20T10:00:00.000Z'),
    });
    ctx.memberships.push({
      userId: 'owner_user',
      studioId: 'studio_one',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date('2026-11-20T10:00:00.000Z'),
    });

    // Studios
    ctx.studios.push(
      {
        id: 'studio_one',
        slug: 'studio-one',
        name: 'Studio One',
        status: 'active',
        settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
        createdAt: new Date('2026-11-20T10:00:00.000Z'),
        updatedAt: new Date('2026-11-20T10:00:00.000Z'),
      },
      {
        id: 'studio_two',
        slug: 'studio-two',
        name: 'Studio Two',
        status: 'onboarding',
        settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
        createdAt: new Date('2026-11-21T10:00:00.000Z'),
        updatedAt: new Date('2026-11-21T10:00:00.000Z'),
      }
    );

    // Payments
    ctx.payments.push({
      paymentId: 'pay_001',
      studioId: 'studio_one',
      orderId: 'ord_001',
      amount: 25000,
      currency: 'INR',
      status: 'completed',
      type: 'online',
      provider: 'razorpay',
      captured: true,
      metadata: {},
      createdAt: new Date('2026-11-22T10:00:00.000Z'),
      updatedAt: new Date('2026-11-22T10:00:00.000Z'),
    });

    const login = async (email: string) => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password: 'Password123!' },
      });
      return res.cookies[0];
    };

    return { ...ctx, login };
  }

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
});
