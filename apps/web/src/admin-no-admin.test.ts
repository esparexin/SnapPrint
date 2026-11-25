import { describe, expect, it } from 'vitest';
import React from 'react';
import { AuthResponse } from '@snapprint/contracts';
import { AdminNoAdminCard, CONTACT_ADMIN_URL } from '../app/admin/admin-no-admin-card';

type ElementProps = {
  children?: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  'data-testid'?: string;
};

describe('AdminNoAdminCard & Platform Admin Access Gatecheck', () => {
  it('defines the correct contact URL for administrator access', () => {
    expect(CONTACT_ADMIN_URL).toBe('https://www.linkedin.com/in/kalyansmv/');
  });

  it('renders the expected minimal copy and elements', () => {
    const element = AdminNoAdminCard();
    const rootProps = element.props as ElementProps;
    expect(rootProps['data-testid']).toBe('no-admin-card');

    const children = React.Children.toArray(
      rootProps.children
    ) as React.ReactElement<ElementProps>[];
    const [emojiEl, titleEl, subtitleEl, linkEl] = children;

    expect(emojiEl.props.children).toBe('🙂');
    expect(titleEl.props.children).toBe('No Admin');
    expect(subtitleEl.props.children).toBe('Please reach out to Kalyan V Medaboina for access.');
    expect(linkEl.props.href).toBe('https://www.linkedin.com/in/kalyansmv/');
    expect(linkEl.props.target).toBe('_blank');
    expect(linkEl.props.rel).toBe('noopener noreferrer');
    expect(linkEl.props.children).toBe('Contact Administrator ↗');
  });

  describe('isPlatformAdmin authorization logic', () => {
    const isPlatformAdmin = (auth: AuthResponse | null): boolean =>
      Boolean(auth?.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active'));

    it('denies access when unauthenticated (null session)', () => {
      expect(isPlatformAdmin(null)).toBe(false);
    });

    it('denies access to non-admin roles (studio_owner, studio_staff)', () => {
      const ownerAuth: AuthResponse = {
        user: {
          id: 'user_1',
          email: 'owner@studio.com',
          name: 'Owner',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
        },
        memberships: [
          {
            userId: 'user_1',
            studioId: 'studio_abc',
            role: 'studio_owner',
            status: 'active',
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      };
      expect(isPlatformAdmin(ownerAuth)).toBe(false);
    });

    it('denies access when platform_admin membership is inactive or suspended', () => {
      const suspendedAdmin: AuthResponse = {
        user: {
          id: 'admin_1',
          email: 'admin@studio.com',
          name: 'Admin',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
        },
        memberships: [
          {
            userId: 'admin_1',
            studioId: 'system_root',
            role: 'platform_admin',
            status: 'suspended',
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      };
      expect(isPlatformAdmin(suspendedAdmin)).toBe(false);
    });

    it('grants access when user has an active platform_admin membership', () => {
      const activeAdmin: AuthResponse = {
        user: {
          id: 'admin_1',
          email: 'kalyan@snapprint.io',
          name: 'Kalyan',
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
      expect(isPlatformAdmin(activeAdmin)).toBe(true);
    });
  });
});
