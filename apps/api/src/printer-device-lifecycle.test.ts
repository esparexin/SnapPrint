import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('Printer Device Lifecycle & Fleet Management (apps/api)', () => {
  const enroll = (ctx: { app: FastifyInstance }, pairingCode: string, hostname: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: { pairingCode, hostname, osPlatform: 'win32', agentVersion: '1.0.0' },
    });

  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const now = new Date();

    ctx.users.push({
      id: 'usr_dev_owner',
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    ctx.studios.push({
      id: 'studio_dev_test',
      slug: 'dev-prints',
      name: 'Dev Prints',
      status: 'active',
      settings: { currency: 'INR', maxActivePrinters: 2, autoApproveOrders: false },
      createdAt: now,
      updatedAt: now,
    });
    ctx.memberships.push({
      userId: 'usr_dev_owner',
      studioId: 'studio_dev_test',
      role: 'studio_owner',
      status: 'active',
      createdAt: now,
    });

    const loginRes = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;

    return { ctx, studioId: 'studio_dev_test', cookies: { [cookie.name]: cookie.value } };
  }

  it('generates pairing key with 15-minute expiry, enrolls device, and rejects reuse/expiration', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();

    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    expect(pairRes.statusCode).toBe(201);
    const { code, expiresAt, studioId: keyStudioId } = pairRes.json();
    expect(code).toMatch(/^SNAP-/);
    expect(keyStudioId).toBe(studioId);

    const diffMs = new Date(expiresAt).getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(15 * 60 * 1000);

    const enrollRes = await enroll(ctx, code, 'WIN-PRINT-01');
    expect(enrollRes.statusCode).toBe(201);
    const enrolled = enrollRes.json();
    expect(enrolled.success).toBe(true);
    expect(enrolled.studioId).toBe(studioId);
    expect(enrolled.deviceId).toMatch(/^dev_/);
    expect(enrolled.deviceToken).toMatch(/^dvt_/);

    const dupRes = await enroll(ctx, code, 'WIN-PRINT-02');
    expect(dupRes.statusCode).toBe(400);
    expect(dupRes.json().code).toBe('KEY_NOT_ACTIVE');
  });

  it('guarantees atomic redemption: concurrent requests cannot register multiple devices', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();
    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    const [res1, res2] = await Promise.all([
      enroll(ctx, code, 'WIN-RACE-A'),
      enroll(ctx, code, 'WIN-RACE-B'),
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);
  });

  it('rejects expired pairing keys with 400 KEY_EXPIRED', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();
    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    await ctx.db
      .collection('agent_pairing_keys')
      .updateOne({ code }, { $set: { expiresAt: new Date(Date.now() - 60_000) } });

    const enrollRes = await enroll(ctx, code, 'WIN-EXPIRED');
    expect(enrollRes.statusCode).toBe(400);
    expect(enrollRes.json().code).toBe('KEY_EXPIRED');
  });

  it('tracks agent heartbeat and updates online status', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();
    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    const enrollRes = await enroll(ctx, code, 'WIN-POS-01');
    const { deviceToken, deviceId } = enrollRes.json();

    const hbRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': deviceToken },
    });
    expect(hbRes.statusCode).toBe(200);

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

  it('revokes device and blocks subsequent agent interactions with 401', async () => {
    const { ctx, studioId, cookies } = await seedStudioOwner();
    const pairRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const { code } = pairRes.json();

    const enrollRes = await enroll(ctx, code, 'WIN-POS-OLD');
    const { deviceToken, deviceId } = enrollRes.json();

    const revokeRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/devices/${deviceId}/revoke`,
      cookies,
    });
    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.json().status).toBe('revoked');

    const hbRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/heartbeat',
      headers: { 'x-device-token': deviceToken },
    });
    expect(hbRes.statusCode).toBe(401);
    expect(hbRes.json().code).toBe('DEVICE_UNAUTHORIZED');

    const syncRes = await ctx.app.inject({
      method: 'POST',
      url: '/agent/sync-printers',
      headers: { 'x-device-token': deviceToken },
      payload: { printers: [] },
    });
    expect(syncRes.statusCode).toBe(401);

    const jobsRes = await ctx.app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': deviceToken },
    });
    expect(jobsRes.statusCode).toBe(401);
  });
});
