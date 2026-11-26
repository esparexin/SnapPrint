import { describe, expect, it } from 'vitest';
import { createMockDb } from '../mock-db.js';
import {
  createPrintJobs,
  findPrintJobsByOrderId,
  resetFailedPrintJobsForOrder,
} from './print-job.repository.js';

describe('resetFailedPrintJobsForOrder', () => {
  const studioId = 'std_test_studio';
  const orderId = 'ord_1234567890abcdef';

  it('resets failed print jobs back to pending and clears lease/errors', async () => {
    const { db } = createMockDb();
    const now = new Date();

    await createPrintJobs(db, [
      {
        jobId: 'job_1',
        studioId,
        orderId,
        itemId: 'item_1',
        assetId: 'asset_1',
        targetPrinterId: 'prn_1',
        printerName: 'LaserJet 1',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 1,
        filename: 'file.pdf',
        status: 'pending',
        createdAt: now.toISOString(),
      },
      {
        jobId: 'job_2',
        studioId,
        orderId,
        itemId: 'item_2',
        assetId: 'asset_2',
        targetPrinterId: 'prn_1',
        printerName: 'LaserJet 1',
        colorMode: 'bw',
        paperSize: 'A4',
        sides: 'single',
        copies: 1,
        filename: 'file2.pdf',
        status: 'pending',
        createdAt: now.toISOString(),
      },
    ]);

    // Mark job_1 as failed with error and device lease
    await db.collection('print_jobs').updateOne(
      { jobId: 'job_1' },
      {
        $set: {
          status: 'failed',
          errorMessage: 'Paper jam in tray 2',
          claimedByDeviceId: 'dev_123',
          claimedAt: now,
          leaseExpiresAt: new Date(Date.now() + 60000),
        },
      }
    );

    const result = await resetFailedPrintJobsForOrder(db, studioId, orderId);
    expect(result.resetCount).toBe(1);

    const jobs = await findPrintJobsByOrderId(db, orderId);
    const job1 = jobs.find((j) => j.jobId === 'job_1');
    expect(job1?.status).toBe('pending');
    expect(job1?.errorMessage).toBeUndefined();
    expect(job1?.claimedByDeviceId).toBeUndefined();
    expect(job1?.leaseExpiresAt).toBeUndefined();
  });

  it('returns resetCount=0 when no failed jobs exist for order', async () => {
    const { db } = createMockDb();
    const result = await resetFailedPrintJobsForOrder(db, studioId, 'ord_nonexistent');
    expect(result.resetCount).toBe(0);
  });
});
