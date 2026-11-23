import {
  InviteStaffRequest,
  InviteStaffResponse,
  RevokeStaffResponse,
  StaffMember,
  Studio,
  StudioMetricsResponse,
  UpdateStudioProfileRequest,
} from '@snapprint/contracts';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:3001';
}

export class WorkspaceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'WorkspaceApiError';
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
    throw new WorkspaceApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new WorkspaceApiError(
      data?.message || `Request failed with status ${res.status}`,
      res.status,
      data?.code
    );
  }

  return data as T;
}

export async function fetchStudioMetrics(
  studioId: string,
  customFetch?: typeof fetch
): Promise<StudioMetricsResponse> {
  return requestJson<StudioMetricsResponse>(
    `/studios/${encodeURIComponent(studioId)}/metrics`,
    { method: 'GET' },
    customFetch
  );
}

export async function fetchStudioStaff(
  studioId: string,
  customFetch?: typeof fetch
): Promise<StaffMember[]> {
  return requestJson<StaffMember[]>(
    `/studios/${encodeURIComponent(studioId)}/staff`,
    { method: 'GET' },
    customFetch
  );
}

export async function inviteStudioStaff(
  studioId: string,
  payload: InviteStaffRequest,
  customFetch?: typeof fetch
): Promise<InviteStaffResponse> {
  return requestJson<InviteStaffResponse>(
    `/studios/${encodeURIComponent(studioId)}/staff/invite`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}

export async function revokeStudioStaff(
  studioId: string,
  staffId: string,
  customFetch?: typeof fetch
): Promise<RevokeStaffResponse> {
  return requestJson<RevokeStaffResponse>(
    `/studios/${encodeURIComponent(studioId)}/staff/${encodeURIComponent(staffId)}`,
    { method: 'DELETE' },
    customFetch
  );
}

export async function updateStudioProfile(
  studioId: string,
  payload: UpdateStudioProfileRequest,
  customFetch?: typeof fetch
): Promise<{ studio: Studio }> {
  return requestJson<{ studio: Studio }>(
    `/studios/${encodeURIComponent(studioId)}/profile`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}
