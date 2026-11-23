import {
  ListPlatformAuditLogsResponse,
  ListPlatformStudiosQuery,
  ListPlatformStudiosResponse,
  PlatformMetricsResponse,
  PlatformStudioItem,
  UpdatePlatformStudioStatusRequest,
} from '@snapprint/contracts';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:3001';
}

export class PlatformAdminApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'PlatformAdminApiError';
  }
}

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  customFetch: typeof fetch = fetch
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await customFetch(`${baseUrl}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    throw new PlatformAdminApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new PlatformAdminApiError(
      data?.message || `Request failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return data as T;
}

export async function getPlatformMetrics(
  customFetch: typeof fetch = fetch
): Promise<PlatformMetricsResponse> {
  return requestJson<PlatformMetricsResponse>('/admin/metrics', { method: 'GET' }, customFetch);
}

export async function listPlatformStudios(
  query: ListPlatformStudiosQuery = {},
  customFetch: typeof fetch = fetch
): Promise<ListPlatformStudiosResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.skip) params.set('skip', String(query.skip));

  const qs = params.toString();
  const endpoint = qs ? `/admin/studios?${qs}` : '/admin/studios';
  return requestJson<ListPlatformStudiosResponse>(endpoint, { method: 'GET' }, customFetch);
}

export async function updatePlatformStudioStatus(
  studioId: string,
  payload: UpdatePlatformStudioStatusRequest,
  customFetch: typeof fetch = fetch
): Promise<{ studio: PlatformStudioItem }> {
  return requestJson<{ studio: PlatformStudioItem }>(
    `/admin/studios/${encodeURIComponent(studioId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}

export async function listPlatformAuditLogs(
  limit = 50,
  customFetch: typeof fetch = fetch
): Promise<ListPlatformAuditLogsResponse> {
  return requestJson<ListPlatformAuditLogsResponse>(
    `/admin/audit-logs?limit=${encodeURIComponent(limit)}`,
    { method: 'GET' },
    customFetch
  );
}
