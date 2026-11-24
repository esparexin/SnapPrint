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