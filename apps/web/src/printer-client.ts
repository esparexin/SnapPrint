import { PaperSize, PrinterRole, PrinterStatus } from '@snapprint/contracts';

export interface StudioPrinter {
  id: string;
  studioId: string;
  name: string;
  driverName: string;
  role: PrinterRole;
  isColorSupported: boolean;
  supportedPaperSizes: PaperSize[];
  status: PrinterStatus;
  isDefaultOsPrinter?: boolean;
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
  return data;
}

export async function fetchStudioPrinters(
  studioId: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ printers: StudioPrinter[] }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/printers`;
  const res = await fetchImpl(url, {
    method: 'GET',
    credentials: 'include',
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
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(data?.message || 'Failed to revoke device', res.status, data?.code);
  }
  return data;
}
