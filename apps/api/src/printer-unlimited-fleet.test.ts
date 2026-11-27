import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Unlimited Fleet & Multi-Activation API', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_unlimited_fleet';
    const studioId = 'studio_unlimited_fleet_test';

    ctx.users.push({
      id: userId,
      email: 'owner_unlimited@example.com',
      name: 'Owner Unlimited',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'unlimited-prints',
      name: 'Unlimited Prints',
      status: 'active',
      settings: {
        currency: 'INR',
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
      payload: { email: 'owner_unlimited@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('supports activating multiple printers without arbitrary hardcoded limits', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();
    const now = new Date().toISOString();

    const keyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    const { code } = keyRes.json();

    const enrollRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        agentVersion: '1.2.0',
        hostname: 'DESKTOP-MULTI-PRINT',
        osPlatform: 'win32',
      },
    });
    const { deviceToken } = enrollRes.json();

    const syncRes = await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': deviceToken },
      payload: {
        printers: [
          {
            printerId: 'prn_c1',
            name: 'Canon Color 1',
            driverName: 'Canon Generic',
            isColorSupported: true,
            supportedPaperSizes: ['A4'],
            duplexSupport: 'supported',
            supportedDuplexSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'prn_bw1',
            name: 'HP LaserJet 1',
            driverName: 'HP Mono',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            duplexSupport: 'unsupported',
            supportedDuplexSizes: [],
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'prn_bw2',
            name: 'HP LaserJet 2',
            driverName: 'HP Mono',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            duplexSupport: 'unsupported',
            supportedDuplexSizes: [],
            status: 'online',
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });
    expect(syncRes.statusCode).toBe(200);

    // Activate all 3 printers
    await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_c1/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_color' },
    });
    await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_bw1/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_bw' },
    });
    await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_bw2/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_bw' },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/printers`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();
    expect(body.allowance.registeredCount).toBe(3);
    expect(body.allowance.activeCount).toBe(3);
    expect(body.allowance.maxActivePrinters).toBeUndefined();
    expect(body.allowance.remainingActiveCapacity).toBeUndefined();
    expect(body.allowance.isLimitReached).toBe(false);
  });
});
