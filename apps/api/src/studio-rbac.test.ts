import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Studio Role-Based Access Control (RBAC)', () => {
  async function seedTestEnvironment() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');

    // Studio Alpha
    ctx.studios.push({
      id: 'studio_alpha',
      slug: 'studio-alpha',
      name: 'Alpha Studio',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Owner of Studio Alpha
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

    // Staff of Studio Alpha
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

    // Platform Admin
    ctx.users.push({
      id: 'user_admin',
      email: 'admin@example.com',
      name: 'Platform Admin',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ctx.memberships.push({
      userId: 'user_admin',
      studioId: null,
      role: 'platform_admin',
      status: 'active',
      createdAt: new Date(),
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

  it('studio_staff can view studio but cannot modify settings or manage staff', async () => {
    const { app, login } = await seedTestEnvironment();
    const staffCookie = await login('staff@example.com');

    // GET /studios/:studioId succeeds for staff (has view_orders permission)
    const viewRes = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      cookies: { [staffCookie.name]: staffCookie.value },
    });
    expect(viewRes.statusCode).toBe(200);
    expect(JSON.parse(viewRes.payload).role).toBe('studio_staff');

    // PATCH /studios/:studioId/settings rejected for staff (lacks manage_studio)
    const settingsRes = await app.inject({
      method: 'PATCH',
      url: '/studios/studio_alpha/settings',
      payload: { autoApproveOrders: true },
      cookies: { [staffCookie.name]: staffCookie.value },
    });
    expect(settingsRes.statusCode).toBe(403);
    expect(JSON.parse(settingsRes.payload).code).toBe('INSUFFICIENT_PERMISSIONS');

    // GET /studios/:studioId/staff rejected for staff
    const staffListRes = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha/staff',
      cookies: { [staffCookie.name]: staffCookie.value },
    });
    expect(staffListRes.statusCode).toBe(403);
    expect(JSON.parse(staffListRes.payload).code).toBe('INSUFFICIENT_PERMISSIONS');

    await app.close();
  });

  it('studio_owner can update settings and manage staff for their studio', async () => {
    const { app, login } = await seedTestEnvironment();
    const ownerCookie = await login('owner@example.com');

    // Update settings
    const settingsRes = await app.inject({
      method: 'PATCH',
      url: '/studios/studio_alpha/settings',
      payload: { autoApproveOrders: true, contactPhone: '+919876543210' },
      cookies: { [ownerCookie.name]: ownerCookie.value },
    });
    expect(settingsRes.statusCode).toBe(200);
    const updated = JSON.parse(settingsRes.payload);
    expect(updated.settings.autoApproveOrders).toBe(true);

    // List staff
    const staffRes = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha/staff',
      cookies: { [ownerCookie.name]: ownerCookie.value },
    });
    expect(staffRes.statusCode).toBe(200);
    expect(JSON.parse(staffRes.payload)).toHaveLength(2); // owner + staff

    // Add new staff
    const addRes = await app.inject({
      method: 'POST',
      url: '/studios/studio_alpha/staff',
      payload: { userId: 'user_new_employee', role: 'studio_staff' },
      cookies: { [ownerCookie.name]: ownerCookie.value },
    });
    expect(addRes.statusCode).toBe(201);
    expect(JSON.parse(addRes.payload).userId).toBe('user_new_employee');

    // Reject elevating to platform_admin
    const invalidRoleRes = await app.inject({
      method: 'POST',
      url: '/studios/studio_alpha/staff',
      payload: { userId: 'user_hacker', role: 'platform_admin' },
      cookies: { [ownerCookie.name]: ownerCookie.value },
    });
    expect(invalidRoleRes.statusCode).toBe(400);

    await app.close();
  });

  it('platform_admin has cross-studio administrative access', async () => {
    const { app, login } = await seedTestEnvironment();
    const adminCookie = await login('admin@example.com');

    const viewRes = await app.inject({
      method: 'GET',
      url: '/studios/studio_alpha',
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(viewRes.statusCode).toBe(200);
    expect(JSON.parse(viewRes.payload).role).toBe('platform_admin');

    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/studios/studio_alpha/settings',
      payload: { maxActivePrinters: 1 },
      cookies: { [adminCookie.name]: adminCookie.value },
    });
    expect(updateRes.statusCode).toBe(200);

    await app.close();
  });
});
