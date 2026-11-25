import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthResponse } from '@snapprint/contracts';
import { buildHomeTopNav } from '../app/components/home-nav-builder.js';

describe('Home Navigation Builder (Session-Aware Top Nav)', () => {
  const onOpenLogin = vi.fn();
  const onOpenRegister = vi.fn();
  const onLogout = vi.fn();

  const options = {
    onOpenLogin,
    onOpenRegister,
    onLogout,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard anonymous nav linking to /portal and /portal?action=register', () => {
    const nav = buildHomeTopNav({ auth: null, ...options });

    expect(nav).toHaveLength(3);
    expect(nav[0]).toEqual({ label: 'About', href: '/about', variant: 'text' });
    expect(nav[1].label).toBe('Login');
    expect(nav[1].href).toBe('/portal');
    expect(nav[2].label).toBe('Register');
    expect(nav[2].href).toBe('/portal?action=register');

    nav[1].onClick?.();
    expect(onOpenLogin).toHaveBeenCalledOnce();

    nav[2].onClick?.();
    expect(onOpenRegister).toHaveBeenCalledOnce();
  });

  it('provides direct links to /portal without callbacks', () => {
    const nav = buildHomeTopNav({ auth: null, onLogout });

    expect(nav).toHaveLength(3);
    expect(nav[1]).toEqual({
      label: 'Login',
      href: '/portal',
      onClick: undefined,
      variant: 'text',
    });
    expect(nav[2]).toEqual({
      label: 'Register',
      href: '/portal?action=register',
      onClick: undefined,
      variant: 'button',
    });
  });

  it('renders Admin Workspace link and Sign Out button for active platform_admin', () => {
    const adminAuth: AuthResponse = {
      user: {
        id: 'admin_1',
        email: 'admin@snapprint.io',
        name: 'Platform Admin',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
        updatedAt: '2026-11-20T00:00:00.000Z',
      },
      memberships: [
        {
          userId: 'admin_1',
          studioId: 'platform_scope',
          role: 'platform_admin',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
        },
      ],
    };

    const nav = buildHomeTopNav({ auth: adminAuth, ...options });

    expect(nav).toHaveLength(3);
    expect(nav[0]).toEqual({ label: 'About', href: '/about', variant: 'text' });
    expect(nav[1]).toEqual({ label: 'Admin Workspace', href: '/admin', variant: 'text' });
    expect(nav[2].label).toBe('Sign Out');
    expect(nav[2].variant).toBe('button');

    nav[2].onClick?.();
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('renders Shop Portal trigger and Sign Out button for studio owners and operators', () => {
    const operatorAuth: AuthResponse = {
      user: {
        id: 'owner_1',
        email: 'owner@studio.com',
        name: 'Shop Owner',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
        updatedAt: '2026-11-20T00:00:00.000Z',
      },
      memberships: [
        {
          userId: 'owner_1',
          studioId: 'studio_main',
          role: 'studio_owner',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
        },
      ],
    };

    const nav = buildHomeTopNav({ auth: operatorAuth, ...options });

    expect(nav).toHaveLength(3);
    expect(nav[0]).toEqual({ label: 'About', href: '/about', variant: 'text' });
    expect(nav[1]).toEqual({ label: 'Shop Portal', href: '/portal', variant: 'text' });
    expect(nav[2].label).toBe('Sign Out');
    expect(nav[2].variant).toBe('button');

    nav[2].onClick?.();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
