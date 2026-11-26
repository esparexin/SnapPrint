import {
  ConfirmPrinterCapabilityRequest,
  CreateCustomPaperSizeRequest,
  CustomPaperSize,
  StandardPaperSizeDefinition,
} from '@snapprint/contracts';
import { getApiBaseUrl, PrinterApiError } from './printer-client.js';

export interface StudioPaperSizesResponse {
  standard: StandardPaperSizeDefinition[];
  custom: CustomPaperSize[];
}

export async function confirmPrinterCapability(
  studioId: string,
  printerId: string,
  payload: ConfirmPrinterCapabilityRequest,
  fetchImpl: typeof fetch = fetch
): Promise<{
  success: boolean;
  printerId: string;
  duplexSupport: string;
  capabilityProvenance: string;
}> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/printers/${encodeURIComponent(printerId)}/capabilities/confirm`;
  const res = await fetchImpl(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to confirm printer capability',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function unbindAgentDevice(
  studioId: string,
  deviceId: string,
  reason?: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; deviceId: string; status: string }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/devices/${encodeURIComponent(deviceId)}/unbind`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ reason: reason || 'Workstation migration' }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to unbind workstation computer',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function fetchStudioPaperSizes(
  studioId: string,
  printerId?: string,
  fetchImpl: typeof fetch = fetch
): Promise<StudioPaperSizesResponse> {
  const query = printerId ? `?printerId=${encodeURIComponent(printerId)}` : '';
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/paper-sizes${query}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to fetch paper sizes',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function createCustomPaperSize(
  studioId: string,
  payload: CreateCustomPaperSizeRequest,
  fetchImpl: typeof fetch = fetch
): Promise<CustomPaperSize> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/paper-sizes`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to create custom paper size',
      res.status,
      data?.code
    );
  }
  return data;
}

export async function deleteCustomPaperSize(
  studioId: string,
  id: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ success: boolean; id: string }> {
  const url = `${getApiBaseUrl()}/studios/${encodeURIComponent(studioId)}/paper-sizes/${encodeURIComponent(id)}`;
  const res = await fetchImpl(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PrinterApiError(
      data?.message || 'Failed to delete custom paper size',
      res.status,
      data?.code
    );
  }
  return data;
}
