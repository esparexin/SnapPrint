import { Db } from 'mongodb';
import {
  DiscoveredPrinter,
  PaperSize,
  PrinterRole,
  PrinterStatus,
  PrintJobRecord,
  PrintJobStatus,
} from '@snapprint/contracts';
import { createPrintJobsForOrder, GeneratedPrintJobDescriptor } from '@snapprint/domain';
import { findOrderById, updateOrderStatus } from './order.repository.js';

export const PRINTERS_COLLECTION = 'studio_printers';
export const PAIRING_KEYS_COLLECTION = 'agent_pairing_keys';
export const AGENT_DEVICES_COLLECTION = 'agent_devices';
export const PRINT_JOBS_COLLECTION = 'print_jobs';

export interface StudioPrinterDocument {
  id: string;
  studioId: string;
  name: string;
  driverName: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  status: PrinterStatus;
  isDefaultOsPrinter: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPairingKeyDocument {
  code: string;
  studioId: string;
  expiresAt: Date;
  status: 'active' | 'consumed' | 'expired' | 'revoked';
  createdAt: Date;
}

export interface AgentDeviceDocument {
  deviceId: string;
  studioId: string;
  hostname: string;
  osPlatform: 'win32' | 'darwin' | 'linux';
  agentVersion: string;
  deviceToken: string;
  status: 'active' | 'revoked';
  lastHeartbeatAt: Date;
  createdAt: Date;
}

export async function createPairingKey(
  db: Db,
  studioId: string,
  code: string,
  expiresAt: Date
): Promise<AgentPairingKeyDocument> {
  const now = new Date();
  // Revoke any previously active pairing keys for this studio
  await db
    .collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION)
    .updateMany({ studioId, status: 'active' }, { $set: { status: 'revoked' } });

  const doc: AgentPairingKeyDocument = {
    code,
    studioId,
    expiresAt,
    status: 'active',
    createdAt: now,
  };

  await db.collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findPairingKey(
  db: Db,
  code: string
): Promise<AgentPairingKeyDocument | null> {
  return db.collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION).findOne({ code });
}

export async function consumePairingKey(db: Db, code: string): Promise<boolean> {
  const res = await db
    .collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION)
    .updateOne({ code, status: 'active' }, { $set: { status: 'consumed' } });
  return res.modifiedCount > 0;
}

export async function registerAgentDevice(
  db: Db,
  device: Omit<AgentDeviceDocument, 'createdAt' | 'lastHeartbeatAt'>
): Promise<AgentDeviceDocument> {
  const now = new Date();
  const doc: AgentDeviceDocument = {
    ...device,
    createdAt: now,
    lastHeartbeatAt: now,
  };
  await db.collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION).insertOne(doc);
  return doc;
}

export async function findAgentDeviceByToken(
  db: Db,
  deviceToken: string
): Promise<AgentDeviceDocument | null> {
  return db
    .collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION)
    .findOne({ deviceToken, status: 'active' });
}

export async function updateDeviceHeartbeat(db: Db, deviceId: string): Promise<void> {
  await db
    .collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION)
    .updateOne({ deviceId }, { $set: { lastHeartbeatAt: new Date() } });
}

export async function syncDiscoveredPrinters(
  db: Db,
  studioId: string,
  printers: DiscoveredPrinter[]
): Promise<void> {
  const now = new Date();
  for (const p of printers) {
    const existing = await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .findOne({ studioId, id: p.printerId });

    if (existing) {
      await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).updateOne(
        { studioId, id: p.printerId },
        {
          $set: {
            name: p.name,
            driverName: p.driverName,
            isColorSupported: p.isColorSupported,
            supportedPaperSizes: p.supportedPaperSizes,
            status: p.status,
            isDefaultOsPrinter: p.isDefaultOsPrinter,
            lastSeenAt: now,
            updatedAt: now,
          },
        }
      );
    } else {
      await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).insertOne({
        id: p.printerId,
        studioId,
        name: p.name,
        driverName: p.driverName,
        role: 'standby',
        isColorSupported: p.isColorSupported,
        supportedPaperSizes: p.supportedPaperSizes,
        status: p.status,
        isDefaultOsPrinter: p.isDefaultOsPrinter,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
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
  const now = new Date();
  // If assigning active_bw or active_color, unset that role on any other printer in this studio
  if (role === 'active_bw' || role === 'active_color') {
    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateMany({ studioId, role }, { $set: { role: 'standby', updatedAt: now } });
  }

  const res = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .updateOne({ studioId, id: printerId }, { $set: { role, updatedAt: now } });
  return res.modifiedCount > 0;
}

export interface PrintJobDocument {
  jobId: string;
  studioId: string;
  orderId: string;
  itemId: string;
  assetId: string;
  targetPrinterId: string;
  printerName: string;
  colorMode: 'bw' | 'color';
  paperSize: PaperSize;
  sides: 'single' | 'double';
  copies: number;
  filename: string;
  pageRange?: string;
  status: PrintJobStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export function toPrintJobRecord(doc: PrintJobDocument): PrintJobRecord {
  return {
    jobId: doc.jobId,
    studioId: doc.studioId,
    orderId: doc.orderId,
    itemId: doc.itemId,
    assetId: doc.assetId,
    targetPrinterId: doc.targetPrinterId,
    printerName: doc.printerName,
    colorMode: doc.colorMode,
    paperSize: doc.paperSize,
    sides: doc.sides,
    copies: doc.copies,
    filename: doc.filename,
    pageRange: doc.pageRange,
    status: doc.status,
    errorMessage: doc.errorMessage,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    completedAt: doc.completedAt
      ? doc.completedAt instanceof Date
        ? doc.completedAt.toISOString()
        : new Date(doc.completedAt).toISOString()
      : undefined,
  };
}

export async function createPrintJobs(
  db: Db,
  jobs: GeneratedPrintJobDescriptor[]
): Promise<PrintJobDocument[]> {
  if (jobs.length === 0) return [];

  const docs: PrintJobDocument[] = jobs.map((j) => {
    const createdDate = new Date(j.createdAt);
    return {
      jobId: j.jobId,
      studioId: j.studioId,
      orderId: j.orderId,
      itemId: j.itemId,
      assetId: j.assetId,
      targetPrinterId: j.targetPrinterId,
      printerName: j.printerName,
      colorMode: j.colorMode,
      paperSize: j.paperSize,
      sides: j.sides,
      copies: j.copies,
      filename: j.filename,
      pageRange: j.pageRange,
      status: 'pending',
      createdAt: createdDate,
      updatedAt: createdDate,
    };
  });

  await db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).insertMany(docs);
  return docs;
}

export async function findPendingPrintJobsByStudio(
  db: Db,
  studioId: string,
  limit: number = 20
): Promise<PrintJobDocument[]> {
  return db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .find({ studioId, status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function findPrintJobById(
  db: Db,
  jobId: string
): Promise<PrintJobDocument | null> {
  return db.collection<PrintJobDocument>(PRINT_JOBS_COLLECTION).findOne({ jobId });
}

export async function findPrintJobsByOrderId(
  db: Db,
  orderId: string
): Promise<PrintJobDocument[]> {
  return db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .find({ orderId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function updatePrintJobStatus(
  db: Db,
  jobId: string,
  status: PrintJobStatus,
  errorMessage?: string
): Promise<boolean> {
  const now = new Date();
  const setPayload: Partial<PrintJobDocument> = {
    status,
    updatedAt: now,
  };
  if (errorMessage !== undefined) {
    setPayload.errorMessage = errorMessage;
  }
  if (status === 'completed') {
    setPayload.completedAt = now;
  }

  const res = await db
    .collection<PrintJobDocument>(PRINT_JOBS_COLLECTION)
    .updateOne({ jobId }, { $set: setPayload });

  return res.modifiedCount > 0;
}

export async function autoDispatchOrderPrintJobs(
  db: Db,
  studioId: string,
  orderId: string
): Promise<PrintJobDocument[]> {
  // 1. Idempotency check: don't duplicate if already dispatched
  const existingJobs = await findPrintJobsByOrderId(db, orderId);
  if (existingJobs.length > 0) {
    return existingJobs;
  }

  // 2. Fetch the order
  const order = await findOrderById(db, studioId, orderId);
  if (!order || !order.items || order.items.length === 0) {
    return [];
  }

  // 3. Fetch studio printers
  const printers = await listStudioPrinters(db, studioId);
  if (printers.length === 0) {
    return [];
  }

  // 4. Generate jobs using pure domain routing
  const routingOrder = {
    orderId: order.orderId,
    studioId: order.studioId,
    items: order.items.map((it, idx) => ({
      assetId: it.assetId,
      filename: it.filename,
      paperSize: it.paperSize,
      colorMode: it.colorMode,
      sides: it.sides,
      copies: it.copies,
      pageSelection: it.pageSelection,
      itemId: `item_${idx + 1}`,
    })),
  };

  const dispatchResult = createPrintJobsForOrder(routingOrder, printers);
  if (!dispatchResult.success || dispatchResult.jobs.length === 0) {
    return [];
  }

  // 5. Persist jobs
  const created = await createPrintJobs(db, dispatchResult.jobs);

  // 6. Transition order to processing
  if (order.status === 'submitted') {
    await updateOrderStatus(db, studioId, orderId, 'processing', {
      eventId: `evt_dispatch_${Date.now()}`,
      fromStatus: 'submitted',
      toStatus: 'processing',
      timestamp: new Date().toISOString(),
      reason: `Auto-dispatched ${created.length} print job(s) to agent spooler queue.`,
    });
  }

  return created;
}

