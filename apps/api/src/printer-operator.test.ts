import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Operator Routes (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_owner_printers';
    const studioId = 'studio_printer_test';

    ctx.users.push({
      id: userId,
      email: 'printer_owner@example.com',
      name: 'Owner Ramesh',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'ramesh-prints',
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
      payload: { email: 'printer_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('POST /studios/:studioId/agent/pairing-keys rejects unauthenticated requests', async () => {
    const { app, studioId } = await seedStudioOwner();
    const res = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /studios/:studioId/agent/pairing-keys generates valid 15-minute pairing key', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();
    const res = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.code).toMatch(/^SNAP-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(body.studioId).toBe(studioId);
    expect(body.status).toBe('active');
  });

  it('GET and PATCH /studios/:studioId/printers manages printer roles', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();

    // 1. Setup device and sync printers
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
        hostname: 'PC',
        osPlatform: 'win32',
      },
    });

    const now = new Date().toISOString();
    await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': enrollRes.json().deviceToken },
      payload: {
        printers: [
          {
            printerId: 'hp_01',
            name: 'HP LaserJet 1020',
            driverName: 'HP Driver',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'epson_01',
            name: 'Epson Color L3150',
            driverName: 'Epson Driver',
            isColorSupported: true,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });

    // 2. Set HP as active_bw
    const roleBwRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/hp_01/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_bw' },
    });
    expect(roleBwRes.statusCode).toBe(200);
    expect(roleBwRes.json().role).toBe('active_bw');

    // 3. Set Epson as active_color
    const roleColorRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/epson_01/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_color' },
    });
    expect(roleColorRes.statusCode).toBe(200);
    expect(roleColorRes.json().role).toBe('active_color');

    // 4. Verify listed printers have updated roles
    const listRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/printers`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(listRes.statusCode).toBe(200);
    const { printers } = listRes.json();
    expect(printers.find((p: { id: string }) => p.id === 'hp_01').role).toBe('active_bw');
    expect(printers.find((p: { id: string }) => p.id === 'epson_01').role).toBe('active_color');

    // 5. Reject active_color on monochromatic printer
    const invalidColorRes = await app.inject({
      method: 'PATCH',
      url: `/studios/${studioId}/printers/hp_01/role`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      payload: { role: 'active_color' },
    });
    expect(invalidColorRes.statusCode).toBe(404);
  });

  it('purges and ignores virtual and software printers during sync', async () => {
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
        hostname: 'PC',
        osPlatform: 'win32',
      },
    });

    const now = new Date().toISOString();
    await app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': enrollRes.json().deviceToken },
      payload: {
        printers: [
          {
            printerId: 'hp_real',
            name: '\\\\manasa\\HP LaserJet M1005',
            driverName: 'HP M1005',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            isDefaultOsPrinter: true,
            lastSeenAt: now,
          },
          {
            printerId: 'anydesk',
            name: 'AnyDesk Printer',
            driverName: 'AnyDesk v4 Driver',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'pdf',
            name: 'Microsoft Print to PDF',
            driverName: 'Print to PDF',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
          {
            printerId: 'onenote',
            name: 'OneNote (Desktop)',
            driverName: 'Send to OneNote',
            isColorSupported: false,
            supportedPaperSizes: ['A4'],
            status: 'online',
            lastSeenAt: now,
          },
        ],
        timestamp: now,
      },
    });

    const listRes = await app.inject({
      method: 'GET',
      url: `/studios/${studioId}/printers`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    });
    expect(listRes.statusCode).toBe(200);
    const { printers } = listRes.json();
    expect(printers).toHaveLength(1);
    expect(printers[0].name).toBe('\\\\manasa\\HP LaserJet M1005');
    expect(printers[0].role).toBe('active_bw');
  });
});
