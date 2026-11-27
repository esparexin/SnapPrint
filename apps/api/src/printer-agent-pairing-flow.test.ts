import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';

describe('PC Agent Pairing Flow & Single Binding Governance (apps/api)', () => {
  async function seedStudioOwner() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_pairing_flow_owner';
    const studioId = 'studio_pairing_flow_test';

    ctx.users.push({
      id: userId,
      email: 'pairing_owner@example.com',
      name: 'Pairing Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      name: 'Pairing Studio',
      slug: 'pairing-studio',
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
      payload: { email: 'pairing_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0];

    return { ...ctx, userId, studioId, cookie };
  }

  it('rejects pairing key generation when PC is already bound and allows it after unbinding', async () => {
    const { app, studioId, cookie } = await seedStudioOwner();
    const headers = { cookie: `${cookie.name}=${cookie.value}` };

    // 1. Generate first pairing key and enroll PC agent
    const keyRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers,
    });
    expect(keyRes.statusCode).toBe(201);
    const { code } = keyRes.json();

    const enrollRes = await app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: code,
        hostname: 'WIN-STUDIO-PC',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    expect(enrollRes.statusCode).toBe(201);
    const { deviceId } = enrollRes.json();

    // 2. Attempt to generate another pairing key while device is active -> 409 ACTIVE_DEVICE_ALREADY_BOUND
    const blockedRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers,
    });
    expect(blockedRes.statusCode).toBe(409);
    expect(blockedRes.json().code).toBe('ACTIVE_DEVICE_ALREADY_BOUND');

    // 3. Unbind the PC
    const unbindRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/devices/${deviceId}/unbind`,
      headers,
      payload: { reason: 'Upgrading PC hardware' },
    });
    expect(unbindRes.statusCode).toBe(200);

    // 4. Now generating a pairing key must succeed
    const allowedRes = await app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      headers,
    });
    expect(allowedRes.statusCode).toBe(201);
    expect(allowedRes.json().code).toMatch(/^SNAP-/);
  });
});
