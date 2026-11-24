import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Device Lifecycle & Fleet Management (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_device_owner';
    const studioId = 'studio_device_test';

    ctx.users.push({
      id: userId,
      email: 'device_owner@example.com',
      name: 'Device Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'device-prints',
      name: 'Device Prints',
      status: 'active',
      settings: {
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
      },
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
      payload: { email: 'device_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;

    return { ctx, studioId, cookies: { [cookie.name]: cookie.value } };
  }

  it('generates pairing key, enrolls agent device, and rejects duplicate key usage', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    // 1. Operator creates pairing key
    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    expect(pairRes.statusCode).toBe(201);
    const { code } = pairRes.json();
    expect(code).toBeDefined();

    // 2. Agent enrolls
    const enrollRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        hostname: 'WIN-PRINT-01',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    expect(enrollRes.statusCode).toBe(201);
    const enrolled = enrollRes.json();
    expect(enrolled.success).toBe(true);
    expect(enrolled.deviceId).toMatch(/^dev_/);
    expect(enrolled.deviceToken).toMatch(/^dvt_/);

    // 3. Duplicate enrollment with same pairing key fails
    const dupRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        hostname: 'WIN-PRINT-02',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    expect(dupRes.statusCode).toBe(400);
    expect(dupRes.json().code).toBe('KEY_NOT_ACTIVE');
  });

  it('tracks agent heartbeat and updates online status', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    const enrollRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        hostname: 'WIN-POS-01',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    const { deviceToken, deviceId } = enrollRes.json();

    // Heartbeat
    const hbRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': deviceToken },
    });
    expect(hbRes.statusCode).toBe(200);
    expect(hbRes.json().success).toBe(true);

    // Check operator fleet status
    const fleetRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/devices`,
      cookies,
    });
    expect(fleetRes.statusCode).toBe(200);
    const devices = fleetRes.json().devices;
    expect(devices.length).toBe(1);
    expect(devices[0].deviceId).toBe(deviceId);
    expect(devices[0].isOnline).toBe(true);
  });

  it('revokes device and rejects future agent interactions with 401', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    const enrollRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        hostname: 'WIN-POS-OLD',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    const { deviceToken, deviceId } = enrollRes.json();

    // Revoke device
    const revokeRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/devices/${deviceId}/revoke`,
      cookies,
    });
    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.json().status).toBe('revoked');

    // Heartbeat from revoked device must fail with 401
    const hbRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': deviceToken },
    });
    expect(hbRes.statusCode).toBe(401);
    expect(hbRes.json().code).toBe('DEVICE_UNAUTHORIZED');

    // Fleet listing reflects revoked status and isOnline false
    const fleetRes = await ctx.app.inject({
      method: 'GET',
      url: `/studios/${studioId}/devices`,
      cookies,
    });
    expect(fleetRes.statusCode).toBe(200);
    const devices = fleetRes.json().devices;
    expect(devices[0].status).toBe('revoked');
    expect(devices[0].isOnline).toBe(false);
  });
});
