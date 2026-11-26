import {
  CapabilityProvenance,
  DuplexSupport,
  PaperSize,
  PrinterRole,
  PrinterStatus,
} from '@snapprint/contracts';

export interface StudioFleetAllowance {
  registeredCount: number;
  activeCount: number;
  maxActivePrinters: number;
  remainingActiveCapacity: number;
  isLimitReached: boolean;
}

export interface StudioPrinter {
  id: string;
  studioId: string;
  name: string;
  driverName: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  duplexSupport?: DuplexSupport;
  supportedDuplexSizes?: PaperSize[];
  capabilityProvenance?: CapabilityProvenance;
  status: PrinterStatus;
  isDefaultOsPrinter?: boolean;
  deviceId?: string;
  lastSeenAt: string;
}

export interface AgentPairingKeyResponse {
  code: string;
  studioId: string;
  expiresAt: string;
  status: 'active' | 'consumed' | 'expired' | 'revoked';
}

export interface AgentDevice {
  deviceId: string;
  studioId: string;
  hostname: string;
  osPlatform: string;
  agentVersion: string;
  status: 'active' | 'revoked';
  isOnline: boolean;
  lastHeartbeatAt: string;
  createdAt: string;
}

import { getApiBaseUrl } from './auth-client.js';

export { getApiBaseUrl };

export function getAgentDownloadUrl(): string {
  return `${getApiBaseUrl()}/downloads/windows-agent/latest.msi`;
}

export class PrinterApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'PrinterApiError';
  }
}

export async function generateAgentPairingKey(
  studioId: string,
  fetchImpl: typeof fetch = fetch
): Promise<AgentPairingKeyResponse> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/agent/pairing-keys`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to generate agent pairing key',
      res.status,
      data?.code
    );
  }
  clearFleetStatusCache();
  return data;
}

export async function fetchStudioPrinters(
  studioId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ printers: StudioPrinter[]; allowance?: StudioFleetAllowance }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/printers`;
  const res = await fetchImpl(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to fetch studio printers',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function updatePrinterRole(
  studioId: string,
  printerId: string,
  role: PrinterRole,
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; printerId: string; role: PrinterRole }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/printers/${encodeURIComponent(printerId)}/role`;
  const res = await fetchImpl(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ role }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to update printer role',
      res.status,
      data?.code
    );
  }
  clearFleetStatusCache();
  return data;
}

export async function fetchStudioDevices(
  studioId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ devices: AgentDevice[] }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/devices`;
  const res = await fetchImpl(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to fetch studio devices',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function revokeAgentDevice(
  studioId: string,
  deviceId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; deviceId: string; status: string }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/devices/${encodeURIComponent(deviceId)}/revoke`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(data?.message || 'Failed to revoke device', res.status, data?.code);
  }
  clearFleetStatusCache();
  return data;
}

export type ShopPrinterStatus = 'not_added' | 'connected' | 'offline';

export function computePrinterStatus(
  printers: readonly { status: string; deviceId?: string }[],
  devices: readonly { deviceId?: string; isOnline: boolean }[]
): ShopPrinterStatus {
  if (!printers || printers.length === 0) return 'not_added';
  const onlineDeviceIds = new Set(
    devices
      .filter((d) => d.isOnline)
      .map((d) => d.deviceId)
      .filter(Boolean)
  );
  const hasLivePrinter = printers.some((p) => {
    if (p.status !== 'online') return false;
    if (p.deviceId) return onlineDeviceIds.has(p.deviceId);
    return devices.some((d) => d.isOnline);
  });
  return hasLivePrinter ? 'connected' : 'offline';
}

let cachedFleetPromise: {
  studioId: string;
  timestamp: number;
  promise: Promise<{ printers: StudioPrinter[]; devices: AgentDevice[] }>;
} | null = null;

export function clearFleetStatusCache(): void {
  cachedFleetPromise = null;
}
export const resetFleetStatusCacheForTests = clearFleetStatusCache;

export async function fetchStudioFleetStatus(
  studioId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ printers: StudioPrinter[]; devices: AgentDevice[]; status: ShopPrinterStatus }> {
  const now = Date.now();
  if (
    !cachedFleetPromise ||
    cachedFleetPromise.studioId !== studioId ||
    now - cachedFleetPromise.timestamp > 10_000
  ) {
    const promise = Promise.all([
      fetchStudioPrinters(studioId, fetchImpl),
      fetchStudioDevices(studioId, fetchImpl),
    ]).then(([pRes, dRes]) => ({
      printers: pRes.printers,
      devices: dRes.devices,
    }));
    cachedFleetPromise = { studioId, timestamp: now, promise };
  }

  const { printers, devices } = await cachedFleetPromise.promise;
  return {
    printers,
    devices,
    status: computePrinterStatus(printers, devices),
  };
}
