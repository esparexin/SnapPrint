import { Db } from 'mongodb';
import { PlatformStudioDetailsResponse } from '@snapprint/contracts';
import { STUDIOS_COLLECTION, StudioDocument } from './studio.repository.js';
import { toPlatformStudioItem } from './platform-admin.repository.js';

function toIsoString(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return new Date(val).toISOString();
  return new Date().toISOString();
}

export async function getPlatformStudioDetails(
  db: Db,
  studioId: string
): Promise<PlatformStudioDetailsResponse | null> {
  const doc = (await db
    .collection(STUDIOS_COLLECTION)
    .findOne({ id: studioId })) as unknown as StudioDocument | null;

  if (!doc) {
    return null;
  }

  const owner = doc.ownerUserId
    ? await db.collection('users').findOne({ id: doc.ownerUserId })
    : null;

  const rawPrinters = await db.collection('studio_printers').find({ studioId }).toArray();
  const rawDevices = await db.collection('agent_devices').find({ studioId }).toArray();

  const rawSub = await db.collection('subscriptions').findOne({ studioId });
  const isSubActive = rawSub?.expiresAt
    ? new Date(rawSub.expiresAt).getTime() > Date.now()
    : rawSub?.status === 'active';
  const subscription = rawSub
    ? {
        plan: rawSub.plan,
        status: (isSubActive ? 'active' : 'expired') as 'active' | 'expired',
        startsAt: rawSub.startsAt ? toIsoString(rawSub.startsAt) : undefined,
        expiresAt: rawSub.expiresAt ? toIsoString(rawSub.expiresAt) : undefined,
      }
    : null;

  const completedJobs = await db
    .collection('print_jobs')
    .find({ studioId, status: 'completed' }, { projection: { colorMode: 1, copies: 1 } })
    .toArray();

  let colorPrints = 0;
  let bwPrints = 0;

  if (completedJobs.length > 0) {
    for (const job of completedJobs) {
      const copies = typeof job.copies === 'number' ? job.copies : 1;
      if (job.colorMode === 'color') {
        colorPrints += copies;
      } else {
        bwPrints += copies;
      }
    }
  } else {
    const completedOrders = await db
      .collection('orders')
      .find({ studioId, status: { $in: ['completed', 'ready'] } }, { projection: { items: 1 } })
      .toArray();

    for (const order of completedOrders) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const copies = typeof item.copies === 'number' ? item.copies : 1;
          const pages = typeof item.pageCount === 'number' ? item.pageCount : 1;
          const count = copies * pages;
          if (item.colorMode === 'color') {
            colorPrints += count;
          } else {
            bwPrints += count;
          }
        }
      }
    }
  }

  const printStats = {
    totalCompletedPrints: colorPrints + bwPrints,
    colorPrints,
    bwPrints,
  };

  const studioItem = toPlatformStudioItem(
    doc,
    owner ? { name: owner.name, email: owner.email } : undefined,
    rawPrinters.length
  );

  return {
    studio: {
      ...studioItem,
      tagline: doc.tagline,
      location: doc.location,
      currency: doc.settings?.currency || 'INR',
      maxActivePrinters: doc.settings?.maxActivePrinters,
      autoApproveOrders: doc.settings?.autoApproveOrders ?? false,
      payment: doc.payment,
    },
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          status: owner.status || 'active',
          createdAt: toIsoString(owner.createdAt),
        }
      : null,
    subscription,
    printStats,
    printers: rawPrinters.map((p) => ({
      id: p.id,
      name: p.name,
      driverName: p.driverName || p.name,
      role: p.role || 'standby',
      isColorSupported: Boolean(p.isColorSupported),
      supportedPaperSizes: Array.isArray(p.supportedPaperSizes) ? p.supportedPaperSizes : ['A4'],
      status: p.status || 'online',
      isDefaultOsPrinter: Boolean(p.isDefaultOsPrinter),
      lastSeenAt: toIsoString(p.lastSeenAt),
    })),
    devices: rawDevices.map((d) => ({
      deviceId: d.deviceId,
      hostname: d.hostname || 'Unknown Host',
      osPlatform: d.osPlatform || 'win32',
      agentVersion: d.agentVersion || '0.1.0',
      status: d.status || 'active',
      lastHeartbeatAt: toIsoString(d.lastHeartbeatAt),
      createdAt: toIsoString(d.createdAt),
    })),
  };
}
