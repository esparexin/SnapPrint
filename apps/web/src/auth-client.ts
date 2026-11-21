import {
  AuthResponse,
  AuthResponseSchema,
  LoginRequest,
  LoginRequestSchema,
} from '@snapprint/contracts';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:3001';
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/**
 * Hydrates current authenticated operator session from GET /auth/me.
 * Sends credentials (HttpOnly cookie) and parses verified AuthResponse.
 * Returns null if user is unauthenticated or session has expired.
 */
export async function fetchCurrentUser(
  customFetch: typeof fetch = fetch
): Promise<AuthResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await customFetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    if (!res.ok) {
      throw new AuthApiError('Failed to verify session', res.status);
    }

    const data = await res.json();
    return AuthResponseSchema.parse(data);
  } catch (err) {
    if (err instanceof AuthApiError) throw err;
    throw new AuthApiError(
      'Network failure: unable to communicate with authentication service',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Authenticates operator with credentials using POST /auth/login.
 * Fastify sets HttpOnly session cookie on response.
 */
export async function loginOperator(
  credentials: LoginRequest,
  customFetch: typeof fetch = fetch
): Promise<AuthResponse> {
  const validated = LoginRequestSchema.parse(credentials);
  const baseUrl = getApiBaseUrl();

  let res: Response;
  try {
    res = await customFetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(validated),
    });
  } catch {
    throw new AuthApiError(
      'Network failure: unable to connect to authentication server',
      0,
      'NETWORK_ERROR'
    );
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const code = payload?.code || 'AUTH_FAILED';
    const message = payload?.message || 'Authentication failed. Please try again.';
    throw new AuthApiError(message, res.status, code);
  }

  return AuthResponseSchema.parse(payload);
}

/**
 * Revokes operator session on server using POST /auth/logout and clears cookie.
 */
export async function logoutOperator(customFetch: typeof fetch = fetch): Promise<void> {
  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await customFetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new AuthApiError(
      'Network failure: unable to reach authentication server to logout',
      0,
      'NETWORK_ERROR'
    );
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const code = payload?.code || 'LOGOUT_FAILED';
    const message = payload?.message || 'Server error occurred during logout';
    throw new AuthApiError(message, res.status, code);
  }
}
