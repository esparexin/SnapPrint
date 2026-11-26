import {
  AuthResponse,
  AuthResponseSchema,
  LoginRequest,
  LoginRequestSchema,
  OtpDispatchResponse,
  OtpDispatchResponseSchema,
  RequestOwnerLoginOtpRequest,
  RequestOwnerLoginOtpRequestSchema,
  RequestOwnerRegistrationOtpRequest,
  RequestOwnerRegistrationOtpRequestSchema,
  VerifyOwnerLoginOtpRequest,
  VerifyOwnerLoginOtpRequestSchema,
  VerifyOwnerRegistrationOtpRequest,
  VerifyOwnerRegistrationOtpRequestSchema,
} from '@snapprint/contracts';

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:3001`;
    }
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

async function postAuthJson<T>(
  endpoint: string,
  body: unknown,
  schema: { parse: (val: unknown) => T },
  customFetch: typeof fetch = fetch
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await customFetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
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
    const code = payload?.code || 'AUTH_ERROR';
    const message = payload?.message || `Request failed with status ${res.status}`;
    throw new AuthApiError(message, res.status, code);
  }

  return schema.parse(payload);
}

export async function fetchCurrentUser(
  customFetch: typeof fetch = fetch
): Promise<AuthResponse | null> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await customFetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
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
 * ARCHITECTURAL RULE: Password-based authentication is disabled for interactive user flows.
 * SnapPrint exclusively uses passwordless Email OTP authentication for operators and owners.
 * Do not use loginOperator with email + password in production UI. Use requestOwnerLoginOtp/verifyOwnerLoginOtp instead.
 */
export async function loginOperator(
  credentials: LoginRequest,
  customFetch: typeof fetch = fetch
): Promise<AuthResponse> {
  const validated = LoginRequestSchema.parse(credentials);
  return postAuthJson('/auth/login', validated, AuthResponseSchema, customFetch);
}

export async function requestOwnerRegistrationOtp(
  data: RequestOwnerRegistrationOtpRequest,
  customFetch: typeof fetch = fetch
): Promise<OtpDispatchResponse> {
  const validated = RequestOwnerRegistrationOtpRequestSchema.parse(data);
  return postAuthJson('/auth/register', validated, OtpDispatchResponseSchema, customFetch);
}

export async function verifyOwnerRegistrationOtp(
  data: VerifyOwnerRegistrationOtpRequest,
  customFetch: typeof fetch = fetch
): Promise<AuthResponse> {
  const validated = VerifyOwnerRegistrationOtpRequestSchema.parse(data);
  return postAuthJson('/auth/register/verify', validated, AuthResponseSchema, customFetch);
}

export async function requestOwnerLoginOtp(
  data: RequestOwnerLoginOtpRequest,
  customFetch: typeof fetch = fetch
): Promise<OtpDispatchResponse> {
  const validated = RequestOwnerLoginOtpRequestSchema.parse(data);
  return postAuthJson('/auth/login/otp/request', validated, OtpDispatchResponseSchema, customFetch);
}

export async function verifyOwnerLoginOtp(
  data: VerifyOwnerLoginOtpRequest,
  customFetch: typeof fetch = fetch
): Promise<AuthResponse> {
  const validated = VerifyOwnerLoginOtpRequestSchema.parse(data);
  return postAuthJson('/auth/login/otp/verify', validated, AuthResponseSchema, customFetch);
}

export async function logoutOperator(customFetch: typeof fetch = fetch): Promise<void> {
  const baseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await customFetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
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

export async function signOutToHome(customFetch: typeof fetch = fetch): Promise<void> {
  await logoutOperator(customFetch);
  if (typeof window !== 'undefined') {
    window.location.replace('/');
  }
}
