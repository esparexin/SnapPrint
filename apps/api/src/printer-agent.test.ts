import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Agent Routes (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_printers_agent';
    const studioId = 'studio_printer_agent_test';

    ctx.users.push({
      id: userId,
      email: 'printer_agent_owner@example.com',
      name: 'Owner Ramesh',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'ramesh-agent-prints',
      name: 'Ramesh Prints',
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
      payload: { email: 'printer_agent_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('POST /agent/enroll registers agent and rejects reuse of consumed key', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();

    // 1. Generate pairing key
    const keyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    const { code } = keyRes.json();

    // 2. Enroll device
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        agentVersion: '1.0.0',
        hostname: 'FRONT-DESK-PC',
        osPlatform: 'win32',
      },
    });

    expect(enrollRes.statusCode).toBe(201);
    const enrollData = enrollRes.json();
    expect(enrollData.success).toBe(true);
    expect(enrollData.studioId).toBe(studioId);
    expect(enrollData.deviceToken).toMatch(/^dvt_/);

    // 3. Reject reuse
    const reuseRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        agentVersion: '1.0.0',
        hostname: 'BACK-DESK-PC',
        osPlatform: 'win32',
      },
    });
    expect(reuseRes.statusCode).toBe(400);
    expect(reuseRes.json().code).toBe('KEY_NOT_ACTIVE');
  });

  it('POST /agent/sync-printers syncs discovered drivers and updates device heartbeat', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();

    const keyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: keyRes.json().code,
        agentVersion: '1.0.0',
        hostname: 'SHOP-PC-01',
        osPlatform: 'win32',
      },
    });
    const { deviceToken } = enrollRes.json();

    const now = new Date().toISOString();
    const syncRes = await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': deviceToken },
      payload: {
        printers: [
          {
            printerId: 'prn_hp_1020',
            name: 'HP LaserJet 1020 Plus',
            driverName: 'HP LaserJet 1020',
            isColorSupported: false,
            supportedPaperSizes: ['A4', 'legal'],
            status: 'online',
            isDefaultOsPrinter: true,
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.json().syncedCount).toBe(1);

    const hbRes = await app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': deviceToken },
    });
    expect(hbRes.statusCode).toBe(200);
    expect(hbRes.json().success).toBe(true);

    const emptyJsonHbRes = await app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: {
        'x-device-token': deviceToken,
        'content-type': 'application/json',
      },
      payload: '',
    });
    expect(emptyJsonHbRes.statusCode).toBe(200);
    expect(emptyJsonHbRes.json().success).toBe(true);

    const validJsonHbRes = await app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: {
        'x-device-token': deviceToken,
        'content-type': 'application/json',
      },
      payload: '{}',
    });
    expect(validJsonHbRes.statusCode).toBe(200);
    expect(validJsonHbRes.json().success).toBe(true);
  });

  it('POST /agent/sync-printers and heartbeat reject missing or invalid token', async () => {
    const { app } = await seedStudioOwner();

    const unauthSync = await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      payload: { printers: [], timestamp: new Date().toISOString() },
    });
    expect(unauthSync.statusCode).toBe(401);

    const badTokenHb = await app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': 'dvt_nonexistent' },
    });
    expect(badTokenHb.statusCode).toBe(401);
  });
});
