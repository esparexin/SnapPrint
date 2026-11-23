import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Studio Workspace API (Issue #29)', () => {
  async function seedTestEnvironment() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');

    ctx.studios.push({
      id: 'studio_alpha',
      slug: 'studio-alpha',
      name: 'Alpha Xerox',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Owner
    ctx.users.push({
      id: 'user_owner',
      email: 'owner@example.com',
      name: 'Studio Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ctx.memberships.push({
      userId: 'user_owner',
      studioId: 'studio_alpha',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    // Staff
    ctx.users.push({
      id: 'user_staff',
      email: 'staff@example.com',
      name: 'Studio Staff',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ctx.memberships.push({
      userId: 'user_staff',
      studioId: 'studio_alpha',
      role: 'studio_staff',
      status: 'active',
      createdAt: new Date(),
    });

    const login = async (email: string) => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password: 'Password123!' },
      });
      const cookieHeader = res.headers['set-cookie'];
      const rawCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
      return rawCookie ? rawCookie.split(';')[0] : '';
    };

    const ownerCookie = await login('owner@example.com');
    const staffCookie = await login('staff@example.com');

    return { ctx, ownerCookie, staffCookie };
  }

  describe('GET /studios/:studioId/metrics', () => {
    it('returns authoritative metrics and excludes unpaid orders from revenue', async () => {
      const { ctx, ownerCookie } = await seedTestEnvironment();
      const now = new Date();

      // Seed 1 Paid Order
      ctx.orders.push({
        orderId: 'ord_paid_1',
        orderNumber: 'SN-001',
        studioId: 'studio_alpha',
        sessionId: 'sess_1',
        idempotencyKey: 'idem_1',
        items: [{ colorMode: 'black_and_white', pageCount: 10, copies: 1 }],
        totalSheets: 5,
        totalAmountMinor: 1500,
        paidAmountMinor: 1500,
        paymentStatus: 'PAID',
        status: 'completed',
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      });

      // Seed 1 Unpaid Pending Order
      ctx.orders.push({
        orderId: 'ord_unpaid_2',
        orderNumber: 'SN-002',
        studioId: 'studio_alpha',
        sessionId: 'sess_2',
        idempotencyKey: 'idem_2',
        items: [{ colorMode: 'color', pageCount: 2, copies: 1 }],
        totalSheets: 2,
        totalAmountMinor: 2000,
        paidAmountMinor: 0,
        paymentStatus: 'UNPAID',
        status: 'submitted',
        currency: 'INR',
        createdAt: now,
        updatedAt: now,
      });

      const res = await ctx.app.inject({
        method: 'GET',
        url: '/studios/studio_alpha/metrics',
        headers: { cookie: ownerCookie },
      });

      expect(res.statusCode).toBe(200);
      const metrics = JSON.parse(res.body);
      expect(metrics.todayOrdersCount).toBe(2);
      expect(metrics.todayPaidCollectionsMinor).toBe(1500); // 2000 unpaid excluded!
      expect(metrics.pendingOrdersCount).toBe(1);
      expect(metrics.printVolume.bwPages).toBe(10);
      expect(metrics.printVolume.colorPages).toBe(2);
    });
  });

  describe('Staff Administration & Permissions', () => {
    it('allows owner to invite and list staff, but blocks non-owners with 403', async () => {
      const { ctx, ownerCookie, staffCookie } = await seedTestEnvironment();

      // Staff member attempts to invite staff -> 403 Forbidden
      const staffAttempt = await ctx.app.inject({
        method: 'POST',
        url: '/studios/studio_alpha/staff/invite',
        headers: { cookie: staffCookie },
        payload: { email: 'helper@example.com', name: 'Helper' },
      });
      expect(staffAttempt.statusCode).toBe(403);

      // Owner invites staff -> 201 Created
      const inviteRes = await ctx.app.inject({
        method: 'POST',
        url: '/studios/studio_alpha/staff/invite',
        headers: { cookie: ownerCookie },
        payload: { email: 'helper@example.com', name: 'Helper' },
      });
      expect(inviteRes.statusCode).toBe(201);
      const invited = JSON.parse(inviteRes.body);
      expect(invited.success).toBe(true);
      expect(invited.staff.email).toBe('helper@example.com');
      expect(invited.staff.status).toBe('invited');

      // Owner lists staff roster
      const rosterRes = await ctx.app.inject({
        method: 'GET',
        url: '/studios/studio_alpha/staff',
        headers: { cookie: ownerCookie },
      });
      expect(rosterRes.statusCode).toBe(200);
      const roster = JSON.parse(rosterRes.body);
      expect(roster.length).toBeGreaterThanOrEqual(2);

      // Owner revokes staff access immediately
      const revokeRes = await ctx.app.inject({
        method: 'DELETE',
        url: `/studios/studio_alpha/staff/${invited.staff.userId}`,
        headers: { cookie: ownerCookie },
      });
      expect(revokeRes.statusCode).toBe(200);
      const revoked = JSON.parse(revokeRes.body);
      expect(revoked.success).toBe(true);
      expect(revoked.status).toBe('revoked');
    });
  });

  describe('PATCH /studios/:studioId/profile', () => {
    it('allows owner to update profile and pause/resume customer order intake', async () => {
      const { ctx, ownerCookie, staffCookie } = await seedTestEnvironment();

      // Staff cannot update profile -> 403
      const staffRes = await ctx.app.inject({
        method: 'PATCH',
        url: '/studios/studio_alpha/profile',
        headers: { cookie: staffCookie },
        payload: { isAcceptingOrders: false },
      });
      expect(staffRes.statusCode).toBe(403);

      // Owner pauses orders
      const pauseRes = await ctx.app.inject({
        method: 'PATCH',
        url: '/studios/studio_alpha/profile',
        headers: { cookie: ownerCookie },
        payload: {
          isAcceptingOrders: false,
          tagline: 'High Speed Printing',
          contactPhone: '+91 98765 43210',
        },
      });
      expect(pauseRes.statusCode).toBe(200);
      const paused = JSON.parse(pauseRes.body);
      expect(paused.studio.settings.isAcceptingOrders).toBe(false);

      // Owner resumes orders
      const resumeRes = await ctx.app.inject({
        method: 'PATCH',
        url: '/studios/studio_alpha/profile',
        headers: { cookie: ownerCookie },
        payload: { isAcceptingOrders: true },
      });
      expect(resumeRes.statusCode).toBe(200);
      const resumed = JSON.parse(resumeRes.body);
      expect(resumed.studio.settings.isAcceptingOrders).toBe(true);
    });
  });
});
