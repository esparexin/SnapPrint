import {
  CustomerSessionResponse,
  CustomerSessionResponseSchema,
  PublicStudio,
  PublicStudioSchema,
} from '@snapprint/contracts';
import { isSessionActive } from '@snapprint/domain';
import { getApiBaseUrl } from './auth-client.js';

export class CustomerApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'CustomerApiError';
  }
}

export function getSessionStorageKey(slug: string): string {
  return `snapprint_customer_session_${slug.trim().toLowerCase()}`;
}

/**
 * Resolves safe public studio info by its stable slug.
 */
export async function fetchPublicStudio(
  slug: string,
  customFetch: typeof fetch = fetch
): Promise<PublicStudio> {
  const baseUrl = getApiBaseUrl();
  let res: Response;

  try {
    res = await customFetch(`${baseUrl}/public/studios/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 60, tags: [`studio-${slug}`] },
    } as RequestInit);
  } catch {
    throw new CustomerApiError('Unable to connect to studio server', 0, 'NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new CustomerApiError(
      payload?.message || 'Studio could not be resolved',
      res.status,
      payload?.code || 'FETCH_FAILED'
    );
  }

  return PublicStudioSchema.parse(payload);
}

/**
 * Initializes a new customer session on the server.
 */
export async function createCustomerSession(
  slug: string,
  customFetch: typeof fetch = fetch
): Promise<CustomerSessionResponse> {
  const baseUrl = getApiBaseUrl();
  let res: Response;

  try {
    res = await customFetch(`${baseUrl}/public/studios/${encodeURIComponent(slug)}/sessions`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new CustomerApiError('Unable to connect to session service', 0, 'NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new CustomerApiError(
      payload?.message || 'Failed to initialize customer session',
      res.status,
      payload?.code || 'SESSION_INIT_FAILED'
    );
  }

  return CustomerSessionResponseSchema.parse(payload);
}

/**
 * Authoritative sessionStorage transport: retrieves active cached session.
 */
export function getStoredCustomerSession(slug: string): CustomerSessionResponse | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(getSessionStorageKey(slug));
    if (!raw) return null;

    const parsed = CustomerSessionResponseSchema.parse(JSON.parse(raw));
    if (!isSessionActive(parsed.session)) {
      window.sessionStorage.removeItem(getSessionStorageKey(slug));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists session in sessionStorage.
 */
export function storeCustomerSession(slug: string, data: CustomerSessionResponse): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.setItem(getSessionStorageKey(slug), JSON.stringify(data));
  } catch {
    // QuotaExceeded or private browsing restriction
  }
}

/**
 * Clears cached customer session from sessionStorage (e.g. on invalid token or session mismatch).
 */
export function clearStoredCustomerSession(slug: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.removeItem(getSessionStorageKey(slug));
  } catch {
    /* ignore */
  }
}

/**
 * Ensures an active session exists without duplicate creation.
 */
export async function ensureCustomerSession(
  slug: string,
  customFetch: typeof fetch = fetch
): Promise<CustomerSessionResponse> {
  const cached = getStoredCustomerSession(slug);
  if (cached) return cached;

  const created = await createCustomerSession(slug, customFetch);
  storeCustomerSession(slug, created);
  return created;
}
