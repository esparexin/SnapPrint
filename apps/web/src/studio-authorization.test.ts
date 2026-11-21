import { describe, expect, it } from 'vitest';
import { AuthResponse } from '@snapprint/contracts';
import { resolveStudioAuthorization } from './studio-authorization.js';

describe('Frontend Studio Authorization State Resolver', () => {
  const baseAuth: AuthResponse = {
    user: {
      id: 'user_1',
      email: 'operator@example.com',
      name: 'Test Operator',
      status: 'active',
      createdAt: '2026-11-21T12:00:00.000Z',
      updatedAt: '2026-11-21T12:00:00.000Z',
    },
    memberships: [],
  };

  it('returns unauthenticated state when no auth response is provided', () => {
    const state = resolveStudioAuthorization(null);
    expect(state.uiState).toBe('unauthenticated');
    expect(state.can('view_orders')).toBe(false);
    expect(state.canAccessTargetStudio('studio_alpha')).toBe(false);
  });

  it('returns no_memberships state when user has no active memberships', () => {
    const auth: AuthResponse = {
      ...baseAuth,
      memberships: [
        {
          userId: 'user_1',
          studioId: 'studio_alpha',
          role: 'studio_staff',
          status: 'suspended',
          createdAt: '2026-11-21T12:00:00.000Z',
        },
      ],
    };

    const state = resolveStudioAuthorization(auth);
    expect(state.uiState).toBe('no_memberships');
    expect(state.activeMemberships).toHaveLength(0);
  });

  it('returns access_denied when operator requests a studio they are not a member of', () => {
    const auth: AuthResponse = {
      ...baseAuth,
      memberships: [
        {
          userId: 'user_1',
          studioId: 'studio_alpha',
          role: 'studio_owner',
          status: 'active',
          createdAt: '2026-11-21T12:00:00.000Z',
        },
      ],
    };

    const state = resolveStudioAuthorization(auth, 'studio_unauthorized');
    expect(state.uiState).toBe('access_denied');
    expect(state.currentMembership).toBeNull();
    expect(state.can('view_orders')).toBe(false);
  });

  it('resolves studio_staff permissions and isolates cross-studio access', () => {
    const auth: AuthResponse = {
      ...baseAuth,
      memberships: [
        {
          userId: 'user_1',
          studioId: 'studio_alpha',
          role: 'studio_staff',
          status: 'active',
          createdAt: '2026-11-21T12:00:00.000Z',
        },
      ],
    };

    const state = resolveStudioAuthorization(auth, 'studio_alpha');
    expect(state.uiState).toBe('ready');
    expect(state.effectiveRole).toBe('studio_staff');
    expect(state.can('view_orders')).toBe(true);
    expect(state.can('download_assets')).toBe(true);
    expect(state.can('manage_studio')).toBe(false);
    expect(state.can('manage_catalog')).toBe(false);
    expect(state.canAccessTargetStudio('studio_alpha')).toBe(true);
    expect(state.canAccessTargetStudio('studio_beta')).toBe(false);
  });

  it('resolves studio_owner permissions for assigned studio', () => {
    const auth: AuthResponse = {
      ...baseAuth,
      memberships: [
        {
          userId: 'user_1',
          studioId: 'studio_alpha',
          role: 'studio_owner',
          status: 'active',
          createdAt: '2026-11-21T12:00:00.000Z',
        },
      ],
    };

    const state = resolveStudioAuthorization(auth);
    expect(state.uiState).toBe('ready');
    expect(state.effectiveRole).toBe('studio_owner');
    expect(state.can('manage_studio')).toBe(true);
    expect(state.can('manage_catalog')).toBe(true);
    expect(state.can('manage_printers')).toBe(true);
    expect(state.can('manage_platform')).toBe(false);
  });

  it('resolves platform_admin with cross-studio privileges', () => {
    const auth: AuthResponse = {
      ...baseAuth,
      memberships: [
        {
          userId: 'user_1',
          studioId: null,
          role: 'platform_admin',
          status: 'active',
          createdAt: '2026-11-21T12:00:00.000Z',
        },
      ],
    };

    const state = resolveStudioAuthorization(auth, 'any_studio');
    expect(state.uiState).toBe('ready');
    expect(state.effectiveRole).toBe('platform_admin');
    expect(state.can('manage_platform')).toBe(true);
    expect(state.canAccessTargetStudio('any_studio')).toBe(true);
  });
});
