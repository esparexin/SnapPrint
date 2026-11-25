import { Db } from 'mongodb';

export const PAIRING_KEYS_COLLECTION = 'agent_pairing_keys';
export const AGENT_DEVICES_COLLECTION = 'agent_devices';
export const AGENT_HEARTBEAT_TIMEOUT_MS = 120_000;

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

export async function hasOnlineAgentDevice(db: Db, studioId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - AGENT_HEARTBEAT_TIMEOUT_MS);
  const count = await db.collection<AgentDeviceDocument>(AGENT_DEVICES_COLLECTION).countDocuments({
    studioId,
    status: 'active',
    lastHeartbeatAt: { $gte: cutoff },
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
