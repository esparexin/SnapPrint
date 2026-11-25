import { Db } from 'mongodb';
import { DiscoveredPrinter, PaperSize, PrinterRole, PrinterStatus } from '@snapprint/contracts';

export const PRINTERS_COLLECTION = 'studio_printers';
export const PAIRING_KEYS_COLLECTION = 'agent_pairing_keys';
export const AGENT_DEVICES_COLLECTION = 'agent_devices';

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
  await db
    .collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION)
    .updateMany({ studioId, status: 'active' }, { $set: { status: 'revoked' } });

  const doc: AgentPairingKeyDocument = { code, studioId, expiresAt, status: 'active', createdAt: now };
  await db.collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION).insertOne(doc);
  return doc;
}

export async function findPairingKey(
  db: Db,
  code: string
): Promise<AgentPairingKeyDocument | null> {
  return db.collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION).findOne({ code });
}

export async function consumePairingKey(
  db: Db,
  code: string,
  now: Date = new Date()
): Promise<AgentPairingKeyDocument | null> {
  return db
    .collection<AgentPairingKeyDocument>(PAIRING_KEYS_COLLECTION)
    .findOneAndUpdate(
      { code, status: 'active', expiresAt: { $gte: now } },
      { $set: { status: 'consumed' } }
    );
}

export async function registerAgentDevice(
  db: Db,
  device: Omit<AgentDeviceDocument, 'createdAt' | 'lastHeartbeatAt'>
): Promise<AgentDeviceDocument> {
  const now = new Date();
  const doc: AgentDeviceDocument = { ...device, createdAt: now, lastHeartbeatAt: now };
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

    if (existing) {
      await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).updateOne(
        { studioId, id: p.printerId },
        {
          $set: {
            name: p.name, driverName: p.driverName, isColorSupported: p.isColorSupported,
            supportedPaperSizes: p.supportedPaperSizes, status: p.status,
            isDefaultOsPrinter: p.isDefaultOsPrinter, lastSeenAt: now, updatedAt: now,
          },
        }
      );
    } else {
      await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).insertOne({
        id: p.printerId, studioId, name: p.name, driverName: p.driverName, role: 'standby',
        isColorSupported: p.isColorSupported, supportedPaperSizes: p.supportedPaperSizes,
        status: p.status, isDefaultOsPrinter: p.isDefaultOsPrinter, lastSeenAt: now,
        createdAt: now, updatedAt: now,
      });
    }
  }

  const activeCount = await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).countDocuments({
    studioId,
    role: { $in: ['active_bw', 'active_color'] },
  });
  if (activeCount === 0 && physicalPrinters.length > 0) {
    const target = physicalPrinters.find((p) => p.isDefaultOsPrinter) || physicalPrinters[0];
    const targetRole: PrinterRole = target.isColorSupported ? 'active_color' : 'active_bw';
    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateOne({ studioId, id: target.printerId }, { $set: { role: targetRole, updatedAt: now } });
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

  const now = new Date();
  if (role === 'active_bw' || role === 'active_color') {
    await db
      .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
      .updateMany({ studioId, role }, { $set: { role: 'standby', updatedAt: now } });
  }

  const res = await db
    .collection<StudioPrinterDocument>(PRINTERS_COLLECTION)
    .updateOne({ studioId, id: printerId }, { $set: { role, updatedAt: now } });
  return res.matchedCount > 0;
}

export const AGENT_HEARTBEAT_TIMEOUT_MS = 120_000;

export async function hasOnlineAgentDevice(db: Db, studioId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - AGENT_HEARTBEAT_TIMEOUT_MS);
  const count = await db.collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION).countDocuments({
    studioId,
    status: 'active',
    lastHeartbeatAt: { $gte: cutoff },
  });
  return count > 0;
}

export async function hasActivePrinterAssigned(db: Db, studioId: string): Promise<boolean> {
  const count = await db.collection<StudioPrinterDocument>(PRINTERS_COLLECTION).countDocuments({
    studioId,
    role: { $in: ['active_bw', 'active_color'] },
    status: 'online',
  });
  return count > 0;
}

export async function listStudioDevices(db: Db, studioId: string): Promise<AgentDeviceDocument[]> {
  return db
    .collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION)
    .find({ studioId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function revokeAgentDevice(
  db: Db,
  studioId: string,
  deviceId: string
): Promise<boolean> {
  const res = await db
    .collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION)
    .updateOne(
      { studioId, deviceId, status: 'active' },
      { $set: { status: 'revoked', deviceToken: `revoked_${Date.now()}` } }
    );
  return res.modifiedCount > 0;
}

export * from './print-job.repository.js';
