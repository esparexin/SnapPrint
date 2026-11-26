import { Db } from 'mongodb';
import { PRINTERS_COLLECTION, StudioPrinterDocument } from './printer.repository.js';
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

  // Find printers that belong to other workstations in this studio to prevent rogue claiming
  const otherPrinters = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .find({ studioId, deviceId: { $exists: true, $ne: deviceId } })
    .toArray();
  const otherPrinterIds = otherPrinters.map((p) => p.id);

  const claimed: PrintJobDocument[] = [];
  for (let i = 0; i < limit; i++) {
    const filter: Record<string, unknown> = {
      studioId,
      status: 'pending',
      $or: [{ deviceId }, { deviceId: { $exists: false } }, { deviceId: '' }],
    };
    if (otherPrinterIds.length > 0) {
      filter.targetPrinterId = { $nin: otherPrinterIds };
    }

    const res = await db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).findOneAndUpdate(
      filter,
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
