import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, TestAuthContext } from '../auth-test-helper.js';
import { atomicClaimNextPendingJobs } from './print-job-claim.repository.js';
import { PRINT_JOBS_COLLECTION, PrintJobDocument } from './print-job.repository.js';

describe('Printer Claim Workstation Isolation', () => {
  let ctx: TestAuthContext;
  const studioId = 'std_test_claim_isolation';

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  it('isolates atomic print job claim strictly to target deviceId', async () => {
    const now = new Date();
    await ctx.db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).insertMany([
      {
        jobId: 'job_dev_1',
        studioId,
        orderId: 'ord_1',
        itemId: 'itm_1',
        assetId: 'ast_1',
        targetPrinterId: 'prn_1',
        printerName: 'Laser 1',
        deviceId: 'dev_pc_1',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 1,
        filename: 'doc1.pdf',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      {
        jobId: 'job_dev_2',
        studioId,
        orderId: 'ord_2',
        itemId: 'itm_2',
        assetId: 'ast_2',
        targetPrinterId: 'prn_2',
        printerName: 'Laser 2',
        deviceId: 'dev_pc_2',
        colorMode: 'bw',
        paperSize: 'A3',
        sides: 'single',
        copies: 1,
        filename: 'doc2.pdf',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const claimedDev1 = await atomicClaimNextPendingJobs(ctx.db as any, studioId, 'dev_pc_1');
    expect(claimedDev1).toHaveLength(1);
    expect(claimedDev1[0].jobId).toBe('job_dev_1');

    const claimedDev2 = await atomicClaimNextPendingJobs(ctx.db as any, studioId, 'dev_pc_2');
    expect(claimedDev2).toHaveLength(1);
    expect(claimedDev2[0].jobId).toBe('job_dev_2');
  });
});
