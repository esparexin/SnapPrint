import { describe, expect, it } from 'vitest';
import React from 'react';
import { AuthResponse } from '@snapprint/contracts';
import {
  CONTACT_OPERATOR_URL,
  OperatorNoOperatorCard,
} from '../app/operator/operator-no-operator-card';

type ElementProps = {
  children?: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  'data-testid'?: string;
};

describe('OperatorNoOperatorCard & Operator Access Gatecheck', () => {
  it('defines the correct contact URL for operator access', () => {
    expect(CONTACT_OPERATOR_URL).toBe('https://www.linkedin.com/in/kalyansmv/');
  });

  it('renders the expected minimal copy and elements', () => {
    const element = OperatorNoOperatorCard();
    const rootProps = element.props as ElementProps;
    expect(rootProps['data-testid']).toBe('no-operator-card');

    const children = React.Children.toArray(
      rootProps.children
    ) as React.ReactElement<ElementProps>[];
    const [emojiEl, titleEl, subtitleEl, linkEl] = children;

    expect(emojiEl.props.children).toBe('🙂');
    expect(titleEl.props.children).toBe('No Operator');
    expect(subtitleEl.props.children).toBe('Please reach out to Kalyan V Medaboina for access.');
    expect(linkEl.props.href).toBe('https://www.linkedin.com/in/kalyansmv/');
    expect(linkEl.props.target).toBe('_blank');
    expect(linkEl.props.rel).toBe('noopener noreferrer');
    expect(linkEl.props.children).toBe('Contact Administrator ↗');
  });

  describe('isOperator authorization logic', () => {
    const isOperator = (auth: AuthResponse | null): boolean =>
      Boolean(
        auth?.memberships.some(
          (m) => (m.role === 'studio_owner' || m.role === 'studio_staff') && m.status === 'active'
        )
      );

    it('denies access when unauthenticated (null session)', () => {
      expect(isOperator(null)).toBe(false);
    });

    it('grants access when user has active studio_owner role', () => {
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
      expect(isOperator(ownerAuth)).toBe(true);
    });

    it('grants access when user has active studio_staff role', () => {
      const staffAuth: AuthResponse = {
        user: {
          id: 'user_2',
          email: 'staff@studio.com',
          name: 'Staff',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
        },
        memberships: [
          {
            userId: 'user_2',
            studioId: 'studio_abc',
            role: 'studio_staff',
            status: 'active',
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      };
      expect(isOperator(staffAuth)).toBe(true);
    });

    it('denies access when operator membership is suspended', () => {
      const suspendedAuth: AuthResponse = {
        user: {
          id: 'user_3',
          email: 'suspended@studio.com',
          name: 'Suspended Owner',
          status: 'active',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
        },
        memberships: [
          {
            userId: 'user_3',
            studioId: 'studio_abc',
            role: 'studio_owner',
            status: 'suspended',
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      };
      expect(isOperator(suspendedAuth)).toBe(false);
    });
  });
});
