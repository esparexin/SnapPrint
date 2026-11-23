import {
  CreateShopInput,
  ShopActivationRequest,
  ShopCapabilitiesConfig,
  ShopLocation,
  ShopPaymentSettings,
  ShopWorkingHours,
  Studio,
  UpdateShopProfileInput,
} from '@snapprint/contracts';

export interface StudioOnboardingProfile extends Studio {
  tagline?: string;
  contactPhone?: string;
  contactEmail?: string;
  location?: ShopLocation;
  workingHours?: ShopWorkingHours;
  capabilities?: ShopCapabilitiesConfig;
  payment?: ShopPaymentSettings;
  readiness?: { canActivate: boolean; errors: string[] };
}

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:3001';
}

export class StudioApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'StudioApiError';
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
  } catch (networkErr) {
    throw new StudioApiError(
      networkErr instanceof Error ? networkErr.message : 'Network request failed',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new StudioApiError(
      data?.message || `Request failed with status ${res.status}`,
      res.status,
      data?.code,
      data?.errors
    );
  }

  return data as T;
}

export async function createStudio(
  payload: CreateShopInput,
  customFetch?: typeof fetch
): Promise<StudioOnboardingProfile> {
  return requestJson<StudioOnboardingProfile>(
    '/studios',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}

export async function fetchMyStudios(
  customFetch?: typeof fetch
): Promise<{ studios: StudioOnboardingProfile[] }> {
  return requestJson<{ studios: StudioOnboardingProfile[] }>(
    '/studios/me',
    { method: 'GET' },
    customFetch
  );
}

export async function updateStudioProfile(
  studioId: string,
  payload: UpdateShopProfileInput,
  customFetch?: typeof fetch
): Promise<StudioOnboardingProfile> {
  return requestJson<StudioOnboardingProfile>(
    `/studios/${encodeURIComponent(studioId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}

export async function verifyStudioRazorpay(
  studioId: string,
  payload: { keyId: string; keySecret: string },
  customFetch?: typeof fetch
): Promise<{ isConfirmed: boolean; message: string }> {
  return requestJson<{ isConfirmed: boolean; message: string }>(
    `/studios/${encodeURIComponent(studioId)}/verify-razorpay`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}

export async function activateStudio(
  studioId: string,
  payload: ShopActivationRequest,
  customFetch?: typeof fetch
): Promise<{ studioId: string; status: string; activatedAt: string; publicUrl: string }> {
  return requestJson<{
    studioId: string;
    status: string;
    activatedAt: string;
    publicUrl: string;
  }>(
    `/studios/${encodeURIComponent(studioId)}/activate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    customFetch
  );
}
