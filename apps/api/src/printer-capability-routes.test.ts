import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Capability & Workstation Routes (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_cap_owner';
    const studioId = 'studio_cap_test';

    ctx.users.push({
      id: userId,
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'cap-prints',
      name: 'Capability Prints',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 10, autoApproveOrders: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.memberships.push({
      userId,
      studioId,
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date(),
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('confirms physical printer capability via PATCH .../capabilities/confirm', async () => {
    const { app, studioId, cookie, db } = await seedStudioOwner();
    await db.collection('studio_printers').insertOne({
      id: 'prn_test_1',
      studioId,
      name: 'HP LaserJet',
      driverName: 'HP M126nw',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      duplexSupport: 'unknown',
      supportedDuplexSizes: [],
      capabilityProvenance: 'unverified',
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_test_1/capabilities/confirm`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { duplexSupport: 'supported', supportedDuplexSizes: ['A4'] },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.duplexSupport).toBe('supported');
    expect(body.capabilityProvenance).toBe('manual_verified');
  });

  it('unbinds workstation PC and rejects subsequent agent requests with DEVICE_UNBOUND', async () => {
    const { app, studioId, cookie, db } = await seedStudioOwner();
    const token = 'dvt_active_workstation_token';
    await db.collection('agent_devices').insertOne({
      deviceId: 'dev_laptop_1',
      studioId,
      hostname: 'Studio-Dell-Laptop',
      osPlatform: 'win32',
      agentVersion: '1.0.0',
      deviceToken: token,
      status: 'active',
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
    });

    // Unbind workstation
    const unbindRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/devices/dev_laptop_1/unbind`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { confirm: true },
    });
    expect(unbindRes.statusCode).toBe(200);
    expect(unbindRes.json().status).toBe('unbound');

    // Agent attempts heartbeat using previous token
    const heartbeatRes = await app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': token },
    });
    expect(heartbeatRes.statusCode).toBe(401);
    expect(heartbeatRes.json().code).toBe('DEVICE_UNBOUND');
  });

  it('creates, lists, toggles, and deletes custom paper sizes', async () => {
    const { app, studioId, cookie, db } = await seedStudioOwner();
    await db.collection('studio_printers').insertOne({
      id: 'prn_plotter',
      studioId,
      name: 'Canon Plotter',
      driverName: 'Plotter Pro',
      role: 'active_color',
      isColorSupported: true,
      supportedPaperSizes: ['A3'],
      duplexSupport: 'unsupported',
      supportedDuplexSizes: [],
      capabilityProvenance: 'unverified',
      status: 'online',
      isDefaultOsPrinter: false,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Create custom paper size
    const createRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/paper-sizes`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: {
        printerId: 'prn_plotter',
        name: 'Architectural D 24x36',
        width: 24,
        height: 36,
        unit: 'in',
        isEnabled: true,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const customSize = createRes.json();
    expect(customSize.id).toMatch(/^cps_/);

    // 2. List paper sizes
    const listRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/paper-sizes?printerId=prn_plotter`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(listBody.standard.length).toBeGreaterThan(0);
    expect(listBody.enabledSizes).toContain('A4');
    expect(listBody.custom).toHaveLength(1);
    expect(listBody.custom[0].name).toBe('Architectural D 24x36');

    // 3. Toggle enabled
    const toggleRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/paper-sizes/${customSize.id}/toggle`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { isEnabled: false },
    });
    expect(toggleRes.statusCode).toBe(200);
    expect(toggleRes.json().isEnabled).toBe(false);

    // 4. Delete custom paper size
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/studios/${studioId}/paper-sizes/${customSize.id}`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().success).toBe(true);
  });
});
