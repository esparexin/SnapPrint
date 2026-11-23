import { describe, expect, it } from 'vitest';
import {
  AuthResponse,
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  OTP_DISPATCH_MESSAGE,
} from '@snapprint/contracts';
import {
  AuthApiError,
  fetchCurrentUser,
  loginOperator,
  logoutOperator,
  requestOwnerLoginOtp,
  requestOwnerRegistrationOtp,
  verifyOwnerLoginOtp,
  verifyOwnerRegistrationOtp,
} from './auth-client.js';

describe('Frontend Authentication API Client', () => {
  const sampleAuth: AuthResponse = {
    user: {
      id: 'user_operator_1',
      email: 'operator@studio.com',
      name: 'Operator Name',
      status: 'active',
      createdAt: '2026-11-21T12:00:00.000Z',
      updatedAt: '2026-11-21T12:00:00.000Z',
    },
    memberships: [
      {
        userId: 'user_operator_1',
        studioId: 'studio_alpha',
        role: 'studio_owner',
        status: 'active',
        createdAt: '2026-11-21T12:00:00.000Z',
      },
    ],
  };

  it('fetchCurrentUser returns AuthResponse when authenticated with session cookie', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify(sampleAuth), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const result = await fetchCurrentUser(mockFetch as unknown as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe('user_operator_1');
    expect(result?.memberships).toHaveLength(1);
  });

  it('fetchCurrentUser returns null when unauthenticated or session expired (401)', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 });

    const result = await fetchCurrentUser(mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it('fetchCurrentUser throws AuthApiError on network failure', async () => {
    const mockFetch = async () => {
      throw new Error('Connection refused');
    };

    await expect(fetchCurrentUser(mockFetch as unknown as typeof fetch)).rejects.toThrow(
      'Network failure: unable to communicate with authentication service'
    );
  });

  it('loginOperator validates credentials client-side and authenticates via POST /auth/login', async () => {
    let capturedMethod = '';
    let capturedBody = '';

    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method || '';
      capturedBody = init?.body as string;
      return new Response(JSON.stringify(sampleAuth), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await loginOperator(
      { email: 'operator@studio.com', password: 'Password123!' },
      mockFetch as unknown as typeof fetch
    );

    expect(capturedMethod).toBe('POST');
    expect(JSON.parse(capturedBody).email).toBe('operator@studio.com');
    expect(res.user.email).toBe('operator@studio.com');
  });

  it('loginOperator rejects malformed inputs before making network request', async () => {
    await expect(loginOperator({ email: 'not-an-email', password: 'short' })).rejects.toThrow();
  });

  it('loginOperator handles 401 invalid credentials error from backend', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );

    await expect(
      loginOperator(
        { email: 'operator@studio.com', password: 'WrongPassword123!' },
        mockFetch as unknown as typeof fetch
      )
    ).rejects.toThrow('Invalid email or password');
  });

  it('loginOperator handles 429 rate limit exceeded response', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );

    try {
      await loginOperator(
        { email: 'operator@studio.com', password: 'Password123!' },
        mockFetch as unknown as typeof fetch
      );
      expect.unreachable('Should have thrown AuthApiError');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthApiError);
      expect((e as AuthApiError).code).toBe('RATE_LIMIT_EXCEEDED');
      expect((e as AuthApiError).statusCode).toBe(429);
    }
  });

  it('logoutOperator calls POST /auth/logout and succeeds on 200', async () => {
    let capturedMethod = '';
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method || '';
      return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
        status: 200,
      });
    };

    await logoutOperator(mockFetch as unknown as typeof fetch);
    expect(capturedMethod).toBe('POST');
  });

  it('logoutOperator handles server error safely', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
      });

    await expect(logoutOperator(mockFetch as unknown as typeof fetch)).rejects.toThrow(
      'Internal server error'
    );
  });

  it('requestOwnerRegistrationOtp and verifyOwnerRegistrationOtp handle registration handshake', async () => {
    const mockDispatch = {
      email: 'owner@studio.com',
      intent: 'owner_registration',
      message: OTP_DISPATCH_MESSAGE,
      resendCooldownSeconds: 60,
      retryAfterSeconds: 60,
    };
    const fetchDispatch = async () => new Response(JSON.stringify(mockDispatch), { status: 200 });

    const dispatchRes = await requestOwnerRegistrationOtp(
      {
        name: 'Owner',
        email: 'owner@studio.com',
        phone: '+919876543210',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      },
      fetchDispatch as unknown as typeof fetch
    );
    expect(dispatchRes.message).toBe(OTP_DISPATCH_MESSAGE);

    const fetchVerify = async () => new Response(JSON.stringify(sampleAuth), { status: 201 });

    const verifyRes = await verifyOwnerRegistrationOtp(
      { email: 'owner@studio.com', code: '123456' },
      fetchVerify as unknown as typeof fetch
    );
    expect(verifyRes.user.email).toBe('operator@studio.com');
  });

  it('requestOwnerLoginOtp and verifyOwnerLoginOtp handle login handshake', async () => {
    const mockDispatch = {
      email: 'owner@studio.com',
      intent: 'owner_login',
      message: OTP_DISPATCH_MESSAGE,
      resendCooldownSeconds: 60,
      retryAfterSeconds: 60,
    };
    const fetchDispatch = async () => new Response(JSON.stringify(mockDispatch), { status: 200 });

    const dispatchRes = await requestOwnerLoginOtp(
      { email: 'owner@studio.com' },
      fetchDispatch as unknown as typeof fetch
    );
    expect(dispatchRes.intent).toBe('owner_login');

    const fetchVerify = async () => new Response(JSON.stringify(sampleAuth), { status: 200 });

    const verifyRes = await verifyOwnerLoginOtp(
      { email: 'owner@studio.com', code: '654321' },
      fetchVerify as unknown as typeof fetch
    );
    expect(verifyRes.user.id).toBe('user_operator_1');
  });
});
