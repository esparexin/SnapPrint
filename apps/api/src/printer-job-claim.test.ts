import { describe, expect, it } from 'vitest';
import { hashPassword } from '@snapprint/domain';
import { createTestApp } from './auth-test-helper.js';
import { createPrintJobs } from './repositories/print-job.repository.js';
import { upsertStudioSubscription } from './repositories/subscription.repository.js';

describe('Atomic Print-Job Claiming & Lease Concurrency (apps/api)', () => {
  async function seedFixture() {
    const ctx = await createTestApp();
    const hash = await hashPassword('Password123!');
    const userId = 'user_claim_owner';
    const studioId = 'studio_claim_test';

    ctx.users.push({
      id: userId,
      email: 'claim_owner@example.com',
      name: 'Claim Owner',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ctx.studios.push({
      id: studioId,
      slug: 'claim-prints',
      name: 'Claim Prints',
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
      payload: { email: 'claim_owner@example.com', password: 'Password123!' },
    });
    const cookie = loginRes.cookies[0]!;
    const cookies = { [cookie.name]: cookie.value };

    await ctx.db.collection('studio_printers').insertOne({
      id: 'prn_bw_1',
      studioId,
      name: 'HP LaserJet Pro',
      driverName: 'HP LaserJet Driver',
      role: 'active_bw',
      isColorSupported: false,
      supportedPaperSizes: ['A4'],
      status: 'online',
      isDefaultOsPrinter: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const p1Res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const dev1Res = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: p1Res.json().code,
        hostname: 'AGENT-01',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    const dev1 = dev1Res.json();

    const p2Res = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/agent/pairing-keys`,
      cookies,
    });
    const dev2Res = await ctx.app.inject({
      method: 'POST',
      url: '/agent/enroll',
      payload: {
        pairingCode: p2Res.json().code,
        hostname: 'AGENT-02',
        osPlatform: 'win32',
        agentVersion: '1.0.0',
      },
    });
    const dev2 = dev2Res.json();

    return { ctx, studioId, cookies, dev1, dev2 };
  }

  it('prevents concurrent double-claim race condition and enforces lease ownership on status updates', async () => {
    const { ctx, studioId, cookies, dev1, dev2 } = await seedFixture();

    const nowIso = new Date().toISOString();
    await upsertStudioSubscription(ctx.db, {
      studioId,
      plan: 'quarterly',
      status: 'active',
      startsAt: new Date(Date.now() - 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      updatedAt: nowIso,
    });

    const jobs = await createPrintJobs(ctx.db, [
      {
        jobId: 'job_race_01',
        studioId,
        orderId: 'ord_race_12345678',
        itemId: 'item_1',
        assetId: 'ast_1',
        targetPrinterId: 'prn_bw_1',
        printerName: 'HP LaserJet Pro',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 1,
        filename: 'doc.pdf',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(jobs.length).toBe(1);
    const jobId = jobs[0].jobId;

    // Device 1 polls and claims the job
    const poll1 = await ctx.app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': dev1.deviceToken },
    });
    expect(poll1.statusCode).toBe(200);
    const claimedBy1 = poll1.json().jobs;
    expect(claimedBy1.length).toBe(1);
    expect(claimedBy1[0].jobId).toBe(jobId);

    // Device 2 polls concurrently - receives 0 jobs because it is claimed
    const poll2 = await ctx.app.inject({
      method: 'GET',
      url: '/agent/jobs/pending',
      headers: { 'x-device-token': dev2.deviceToken },
    });
    expect(poll2.statusCode).toBe(200);
    expect(poll2.json().jobs.length).toBe(0);

    // Device 2 attempts to report status on Device 1's claimed job -> 409 Conflict
    const dev2Update = await ctx.app.inject({
      method: 'POST',
      url: `/agent/jobs/${jobId}/status`,
      headers: { 'x-device-token': dev2.deviceToken },
      payload: { status: 'completed' },
    });
    expect(dev2Update.statusCode).toBe(409);
    expect(dev2Update.json().code).toBe('JOB_CLAIM_CONFLICT');

    // Device 1 marks it failed
    const dev1Update = await ctx.app.inject({
      method: 'POST',
      url: `/agent/jobs/${jobId}/status`,
      headers: { 'x-device-token': dev1.deviceToken },
      payload: { status: 'failed', errorMessage: 'Paper jam' },
    });
    expect(dev1Update.statusCode).toBe(200);

    // Operator manually requeues failed job
    const requeueRes = await ctx.app.inject({
      method: 'POST',
      url: `/studios/${studioId}/jobs/${jobId}/requeue`,
      cookies,
    });
    expect(requeueRes.statusCode).toBe(200);
    expect(requeueRes.json().status).toBe('pending');
  });
});
