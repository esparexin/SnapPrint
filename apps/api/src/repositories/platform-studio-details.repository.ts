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

  const studioItem = toPlatformStudioItem(
    doc,
    owner ? { name: owner.name, email: owner.email } : undefined
  );

  return {
    studio: {
      ...studioItem,
      tagline: doc.tagline,
      location: doc.location,
      currency: doc.settings?.currency || 'INR',
      maxActivePrinters: doc.settings?.maxActivePrinters ?? 2,
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
