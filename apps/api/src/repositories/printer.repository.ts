import { Db } from 'mongodb';
import {
  CapabilityProvenance,
  DiscoveredPrinter,
  DuplexSupport,
  PaperSize,
  PrinterRole,
  PrinterStatus,
} from '@snapprint/contracts';

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
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function syncDiscoveredPrinters(
  db: Db,
  studioId: string,
  printers: DiscoveredPrinter[]
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
    const pFields = {
      name: p.name,
      driverName: p.driverName,
      isColorSupported: p.isColorSupported,
      supportedPaperSizes: p.supportedPaperSizes,
      duplexSupport: p.duplexSupport ?? 'unknown',
      supportedDuplexSizes: p.supportedDuplexSizes ?? [],
      capabilityProvenance: p.capabilityProvenance ?? 'unverified',
      status: p.status,
      isDefaultOsPrinter: p.isDefaultOsPrinter,
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
      });
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

  const studio = await db
    .collection<{ id: string; settings?: { maxActivePrinters?: number } }>('studios')
    .findOne({ id: studioId });
  const maxActivePrinters = studio?.settings?.maxActivePrinters ?? 2;

  const now = new Date();
  if (role === 'active_bw' || role === 'active_color') {
    const activePrinters = await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .find({ studioId, role: { $in: ['active_bw', 'active_color'] } })
      .toArray();

    const otherActive = activePrinters.filter((p) => p.id !== printerId && p.role !== role);
    if (otherActive.length + 1 > maxActivePrinters) {
      return false;
    }

    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateMany({ studioId, role }, { $set: { role: 'standby', updatedAt: now } });
  }

  const res = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .updateOne({ studioId, id: printerId }, { $set: { role, updatedAt: now } });
  return res.matchedCount > 0;
}

export async function hasActivePrinterAssigned(db: Db, studioId: string): Promise<boolean> {
  const count = await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).countDocuments({
    studioId,
    role: { $in: ['active_bw', 'active_color'] },
    status: 'online',
  });
  return count > 0;
}

export * from './agent-device.repository.js';
export * from './print-job.repository.js';
export * from './printer-allowance.repository.js';
