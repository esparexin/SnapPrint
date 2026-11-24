import { Db } from 'mongodb';
import { PRINT_JOBS_COLLECTION, PrintJobDocument } from './print-job.repository.js';

export const JOB_LEASE_DURATION_MS = 600_000; // 10 minutes lease

export async function atomicClaimNextPendingJobs(
  db: Db,
  studioId: string,
  deviceId: string,
  limit: number = 5
): Promise<PrintJobDocument[]> {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + JOB_LEASE_DURATION_MS);
  const staleCutoff = new Date(now.getTime() - JOB_LEASE_DURATION_MS);

  // Transition expired processing jobs to stalled state to prevent infinite locks
  await db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).updateMany(
    {
      studioId,
      status: 'processing',
      $or: [{ leaseExpiresAt: { $lt: now } }, { updatedAt: { $lt: staleCutoff } }],
    },
    {
      $set: {
        status: 'stalled',
        updatedAt: now,
        errorMessage: 'Job processing lease expired without completion (stalled).',
      },
    }
  );

  const claimed: PrintJobDocument[] = [];
  for (let i = 0; i < limit; i++) {
    const res = await db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).findOneAndUpdate(
      { studioId, status: 'pending' },
      {
        $set: {
          status: 'processing',
          claimedByDeviceId: deviceId,
          claimedAt: now,
          leaseExpiresAt: leaseExpiry,
          updatedAt: now,
        },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );
    if (!res) break;
    claimed.push(res);
  }
  return claimed;
}

export async function requeuePrintJob(
  db: Db,
  studioId: string,
  jobId: string,
  reason?: string
): Promise<PrintJobDocument | null> {
  const now = new Date();
  return db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).findOneAndUpdate(
    { studioId, jobId, status: { $in: ['stalled', 'failed'] } },
    {
      $set: {
        status: 'pending',
        updatedAt: now,
        errorMessage: reason ? `Operator requeued: ${reason}` : undefined,
      },
      $unset: { claimedByDeviceId: '', claimedAt: '', leaseExpiresAt: '' },
    },
    { returnDocument: 'after' }
  );
}
