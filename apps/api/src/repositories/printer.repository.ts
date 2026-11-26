import { Db } from 'mongodb';
import {
  CapabilityProvenance,
  DiscoveredPrinter,
  DuplexSupport,
  PaperSize,
  PrinterRole,
  PrinterStatus,
} from '@snapprint/contracts';
import {
  AGENT_DEVICES_COLLECTION,
  AgentDeviceDocument,
  AGENT_HEARTBEAT_TIMEOUT_MS,
} from './agent-device.repository.js';

export const PRINTERS_COLLECTION = 'studio_printers';

export interface StudioPrinterDocument {
  id: string;
  studioId: string;
  name: string;
  driverName: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  duplexSupport: DuplexSupport;
  supportedDuplexSizes: PaperSize[];
  capabilityProvenance: CapabilityProvenance;
  status: PrinterStatus;
  isDefaultOsPrinter: boolean;
  deviceId?: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function syncDiscoveredPrinters(
  db: Db,
  studioId: string,
  printers: DiscoveredPrinter[],
  deviceId?: string
): Promise<void> {
  const now = new Date();
  const vRegex = /anydesk|print to pdf|onenote|xps document|fax|cutepdf|adobe pdf|virtual print/i;
  await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).deleteMany({
    studioId,
    $or: [{ name: { $regex: vRegex } }, { driverName: { $regex: vRegex } }],
  });

  const physicalPrinters = printers.filter((p) => !vRegex.test(`${p.name} ${p.driverName || ''}`));
  for (const p of physicalPrinters) {
    const existing = await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .findOne({ studioId, id: p.printerId });

    const isManualVerified = existing?.capabilityProvenance === 'manual_verified';
    const existingCustomSizes =
      existing?.supportedPaperSizes?.filter((s) => typeof s === 'string' && s.startsWith('cps_')) ??
      [];
    const mergedSupportedPaperSizes = Array.from(
      new Set([...p.supportedPaperSizes, ...existingCustomSizes])
    );

    const pFields: Partial<StudioPrinterDocument> = {
      name: p.name,
      driverName: p.driverName,
      isColorSupported: p.isColorSupported,
      supportedPaperSizes: mergedSupportedPaperSizes,
      duplexSupport: isManualVerified ? existing.duplexSupport : (p.duplexSupport ?? 'unknown'),
      supportedDuplexSizes: isManualVerified
        ? existing.supportedDuplexSizes
        : (p.supportedDuplexSizes ?? []),
      capabilityProvenance: isManualVerified
        ? 'manual_verified'
        : (p.capabilityProvenance ?? 'unverified'),
      status: p.status,
      isDefaultOsPrinter: p.isDefaultOsPrinter,
      deviceId: p.deviceId || deviceId || existing?.deviceId,
      lastSeenAt: now,
      updatedAt: now,
    };

    if (existing) {
      await db
        .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
        .updateOne({ studioId, id: p.printerId }, { $set: pFields });
    } else {
      await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).insertOne({
        id: p.printerId,
        studioId,
        role: 'standby',
        ...pFields,
        createdAt: now,
      } as StudioPrinterDocument);
    }
  }

  const activeCount = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .countDocuments({
      studioId,
      role: { $in: ['active_bw', 'active_color'] },
    });
  if (activeCount === 0 && physicalPrinters.length > 0) {
    const target = physicalPrinters.find((p) => p.isDefaultOsPrinter) || physicalPrinters[0];
    const targetRole: PrinterRole = target.isColorSupported ? 'active_color' : 'active_bw';
    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateOne(
        { studioId, id: target.printerId },
        { $set: { role: targetRole, updatedAt: now } }
      );
  }
}

export async function listStudioPrinters(
  db: Db,
  studioId: string
): Promise<StudioPrinterDocument[]> {
  return db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).find({ studioId }).toArray();
}

export async function listStudioPrintersWithLiveness(
  db: Db,
  studioId: string
): Promise<StudioPrinterDocument[]> {
  const cutoff = new Date(Date.now() - AGENT_HEARTBEAT_TIMEOUT_MS);
  const [printers, allStudioDevices] = await Promise.all([
    db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).find({ studioId }).toArray(),
    db
      .collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION)
      .find({ studioId, status: 'active' })
      .toArray(),
  ]);

  if (allStudioDevices.length === 0) {
    return printers;
  }

  const onlineDeviceIds = new Set(
    allStudioDevices
      .filter((d) => d.lastHeartbeatAt && new Date(d.lastHeartbeatAt) >= cutoff)
      .map((d) => d.deviceId)
  );

  return printers.map((p) => {
    const isHostOnline = p.deviceId ? onlineDeviceIds.has(p.deviceId) : onlineDeviceIds.size > 0;
    const effectiveStatus: PrinterStatus =
      p.status === 'online' && isHostOnline ? 'online' : 'offline';
    return {
      ...p,
      status: effectiveStatus,
    };
  });
}

export async function updateStudioPrinterRole(
  db: Db,
  studioId: string,
  printerId: string,
  role: PrinterRole
): Promise<boolean> {
  const printer = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .findOne({ studioId, id: printerId });
  if (!printer) return false;
  if (role === 'active_color' && !printer.isColorSupported) return false;

  const now = new Date();
  const res = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .updateOne({ studioId, id: printerId }, { $set: { role, updatedAt: now } });
  return res.matchedCount > 0;
}

export async function confirmPrinterCapability(
  db: Db,
  studioId: string,
  printerId: string,
  duplexSupport: DuplexSupport,
  supportedDuplexSizes?: PaperSize[]
): Promise<boolean> {
  const now = new Date();
  const updateData: Partial<StudioPrinterDocument> = {
    duplexSupport,
    capabilityProvenance: 'manual_verified',
    updatedAt: now,
  };
  if (supportedDuplexSizes && supportedDuplexSizes.length > 0) {
    updateData.supportedDuplexSizes = supportedDuplexSizes;
  }
  const res = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .updateOne({ studioId, id: printerId }, { $set: updateData });
  return res.matchedCount > 0;
}

export async function hasActivePrinterAssigned(db: Db, studioId: string): Promise<boolean> {
  const printers = await listStudioPrintersWithLiveness(db, studioId);
  return printers.some(
    (p) => (p.role === 'active_bw' || p.role === 'active_color') && p.status === 'online'
  );
}

export * from './agent-device.repository.js';
export * from './print-job.repository.js';
export * from './printer-allowance.repository.js';
