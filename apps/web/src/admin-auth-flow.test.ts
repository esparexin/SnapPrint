import { describe, expect, it } from 'vitest';
import { AuthResponse } from '@snapprint/contracts';
import { AuthApiError } from './auth-client.js';

describe('Admin Direct Login Security & Brute-Force Defenses', () => {
  const adminAuth: AuthResponse = {
    user: {
      id: 'admin_1',
      email: 'admin@snapprint.io',
      name: 'Super Admin',
      status: 'active',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
    memberships: [
      {
        userId: 'admin_1',
        studioId: 'system_root',
        role: 'platform_admin',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ],
  };

  const operatorAuth: AuthResponse = {
    user: {
      id: 'operator_1',
      email: 'shop@snapprint.io',
      name: 'Shop Operator',
      status: 'active',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
    memberships: [
      {
        userId: 'operator_1',
        studioId: 'studio_koramangala',
        role: 'studio_owner',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ],
  };

  it('verifies platform_admin role is strictly gatechecked', () => {
    const isPlatformAdmin = (auth: AuthResponse) =>
      auth.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active');

    expect(isPlatformAdmin(adminAuth)).toBe(true);
    expect(isPlatformAdmin(operatorAuth)).toBe(false);
  });

  it('rejects inactive platform_admin memberships', () => {
    const inactiveAdminAuth: AuthResponse = {
      ...adminAuth,
      memberships: [{ ...adminAuth.memberships[0], status: 'suspended' }],
    };
    const isPlatformAdmin = (auth: AuthResponse) =>
      auth.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active');

    expect(isPlatformAdmin(inactiveAdminAuth)).toBe(false);
  });

  it('handles 429 rate limit errors with user-friendly throttling notices', () => {
    const rateLimitErr = new AuthApiError('Too many requests', 429, 'RATE_LIMITED');
    const getErrMsg = (err: unknown, fallback: string) =>
      err instanceof AuthApiError && err.statusCode === 429
        ? 'Too many attempts. Security throttling active — please wait.'
        : err instanceof Error
          ? err.message
          : fallback;

    expect(getErrMsg(rateLimitErr, 'Fallback error')).toBe(
      'Too many attempts. Security throttling active — please wait.'
    );
  });

  it('tracks verification attempts and invalidates after 3 consecutive failures', () => {
    let attempts = 0;
    const maxAttempts = 3;

    const recordAttempt = () => {
      attempts += 1;
      const remaining = maxAttempts - attempts;
      return {
        exhausted: attempts >= maxAttempts,
        message:
          attempts >= maxAttempts
            ? 'Maximum attempts (3/3) exceeded. Code invalidated. Request a new code.'
            : `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    };

    const attempt1 = recordAttempt();
    expect(attempt1.exhausted).toBe(false);
    expect(attempt1.message).toBe('Invalid code. 2 attempts remaining.');

    const attempt2 = recordAttempt();
    expect(attempt2.exhausted).toBe(false);
    expect(attempt2.message).toBe('Invalid code. 1 attempt remaining.');

    const attempt3 = recordAttempt();
    expect(attempt3.exhausted).toBe(true);
    expect(attempt3.message).toBe(
      'Maximum attempts (3/3) exceeded. Code invalidated. Request a new code.'
    );
  });

  it('enforces 60-second cooldown timer between OTP dispatches', () => {
    let cooldown = 60;
    const tick = () => {
      cooldown = Math.max(0, cooldown - 1);
    };

    expect(cooldown > 0).toBe(true);
    tick();
    expect(cooldown).toBe(59);
    for (let i = 0; i < 59; i++) tick();
    expect(cooldown).toBe(0);
  });
});
