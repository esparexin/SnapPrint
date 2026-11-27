import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Fleet Allowance & Duplex Persistence API', () => {
  async function seedStudioOwner(maxActivePrinters?: number) {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_printers_limits';
    const studioId = 'studio_printer_limits_test';

    ctx.users.push({
      id: userId,
      email: 'printer_owner_limits@example.com',
      name: 'Owner Ramesh',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const settings: { currency: string; autoApproveOrders: boolean; maxActivePrinters?: number } = {
      currency: 'INR',
      autoApproveOrders: false,
    };
    if (typeof maxActivePrinters === 'number') {
      settings.maxActivePrinters = maxActivePrinters;
    }

    ctx.studios.push({
      id: studioId,
      slug: 'ramesh-prints-limits',
      name: 'Ramesh Prints Limits',
      status: 'active',
      settings,
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
      payload: { email: 'printer_owner_limits@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('syncs duplex capabilities with provenance and returns fleet allowance', async () => {
    const { app, studioId, cookie } = await seedStudioOwner(2);
    const now = new Date().toISOString();

    // 1. Generate pairing key and enroll device
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
        hostname: 'DESKTOP-PRINT-NODE',
        osPlatform: 'win32',
      },
    });
    const { deviceToken } = enrollRes.json();

    // 2. Sync physical printers: 1 duplex color, 1 simplex B&W, 1 unknown standby
    const syncRes = await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': deviceToken },
      payload: {
        printers: [
          {
            printerId: 'prn_canon_biz',
            name: 'Canon imageRUNNER ADVANCE C3530',
            driverName: 'Canon Generic Plus UFR II',
            isColorSupported: true,
            supportedPaperSizes: ['A4', 'A3'],
            duplexSupport: 'supported',
            supportedDuplexSizes: ['A4', 'A3'],
            capabilityProvenance: 'driver_query',
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'prn_hp_mono',
            name: 'HP LaserJet 1020',
            driverName: 'HP LaserJet 1020 Driver',
            isColorSupported: false,
            supportedPaperSizes: ['A4', 'legal'],
            duplexSupport: 'unsupported',
            supportedDuplexSizes: [],
            capabilityProvenance: 'system_detected',
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'prn_generic_backup',
            name: 'Generic Network Backup',
            driverName: 'Generic Text',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            duplexSupport: 'unknown',
            supportedDuplexSizes: [],
            capabilityProvenance: 'unverified',
            status: 'online',
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });
    expect(syncRes.statusCode).toBe(200);

    // 3. Query operator printers endpoint and verify allowance + duplex fields
    const listRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/printers`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(listRes.statusCode).toBe(200);
    const body = listRes.json();

    expect(body.allowance).toBeDefined();
    expect(body.allowance.registeredCount).toBe(3);
    expect(body.allowance.maxActivePrinters).toBe(2);
    expect(body.allowance.activeCount).toBe(1); // default OS printer auto-activated
    expect(body.allowance.remainingActiveCapacity).toBe(1);
    expect(body.allowance.isLimitReached).toBe(false);

    const canon = body.printers.find((p: { id: string }) => p.id === 'prn_canon_biz');
    expect(canon.duplexSupport).toBe('supported');
    expect(canon.supportedDuplexSizes).toEqual(['A4', 'A3']);
    expect(canon.capabilityProvenance).toBe('driver_query');

    const hp = body.printers.find((p: { id: string }) => p.id === 'prn_hp_mono');
    expect(hp.duplexSupport).toBe('unsupported');
    expect(hp.capabilityProvenance).toBe('system_detected');

    const backup = body.printers.find((p: { id: string }) => p.id === 'prn_generic_backup');
    expect(backup.duplexSupport).toBe('unknown');
    expect(backup.capabilityProvenance).toBe('unverified');

    // 4. Activate HP as active_bw
    const roleRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/prn_hp_mono/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_bw' },
    });
    expect(roleRes.statusCode).toBe(200);

    // 5. Verify allowance shows 2 active and limit reached
    const fullAllowanceRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/printers`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    const fullAllowance = fullAllowanceRes.json().allowance;
    expect(fullAllowance.activeCount).toBe(2);
    expect(fullAllowance.remainingActiveCapacity).toBe(0);
    expect(fullAllowance.isLimitReached).toBe(true);
  });
});
