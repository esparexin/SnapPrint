import { describe, expect, it } from 'vitest';
import {
  AuthResponseSchema,
  EmailSchema,
  LoginRequestSchema,
  OperatorSessionSchema,
  UserMembershipSchema,
  UserRoleSchema,
  UserSchema,
} from './identity.js';

describe('Identity, User & Operator Contracts', () => {
  it('validates defined user roles', () => {
    expect(UserRoleSchema.safeParse('platform_admin').success).toBe(true);
    expect(UserRoleSchema.safeParse('studio_owner').success).toBe(true);
    expect(UserRoleSchema.safeParse('studio_staff').success).toBe(true);
    expect(UserRoleSchema.safeParse('customer').success).toBe(false); // Customers are account-free QR sessions
  });

  it('validates platform admin with null studioId', () => {
    const membership = {
      userId: 'usr_admin1',
      studioId: null,
      role: 'platform_admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    expect(UserMembershipSchema.safeParse(membership).success).toBe(true);
  });

  it('validates studio owner with bound studioId', () => {
    const membership = {
      userId: 'usr_owner1',
      studioId: 'std_koramangala',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    expect(UserMembershipSchema.safeParse(membership).success).toBe(true);
  });

  it('normalizes email by trimming whitespace and converting to lowercase', () => {
    const parsed = EmailSchema.parse('  Operator.Photo@Example.COM  ');
    expect(parsed).toBe('operator.photo@example.com');
  });

  it('rejects invalid email formats', () => {
    expect(EmailSchema.safeParse('not-an-email').success).toBe(false);
    expect(EmailSchema.safeParse('@missing-local.com').success).toBe(false);
    expect(EmailSchema.safeParse('').success).toBe(false);
  });

  it('validates UserSchema without exposing password hashes', () => {
    const validUser = {
      id: 'usr_abc123',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      status: 'active',
      createdAt: '2026-11-21T10:00:00.000Z',
      updatedAt: '2026-11-21T10:00:00.000Z',
    };

    const parsed = UserSchema.parse(validUser);
    expect(parsed.id).toBe('usr_abc123');
    expect(parsed.email).toBe('owner@studio.com');
    expect((parsed as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('validates OperatorSessionSchema with active and revoked statuses', () => {
    const activeSession = {
      sessionId: 'session_abcdef1234567890',
      userId: 'usr_operator1',
      status: 'active',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-12-05T10:00:00.000Z',
      lastActiveAt: '2026-11-21T12:00:00.000Z',
    };

    expect(OperatorSessionSchema.safeParse(activeSession).success).toBe(true);

    const revokedSession = {
      ...activeSession,
      status: 'revoked',
    };
    expect(OperatorSessionSchema.safeParse(revokedSession).success).toBe(true);
  });

  it('validates LoginRequestSchema enforcing minimum 8 characters password', () => {
    const validLogin = {
      email: '  OWNER@STUDIO.COM  ',
      password: 'SecurePassword123!',
    };

    const parsed = LoginRequestSchema.parse(validLogin);
    expect(parsed.email).toBe('owner@studio.com');
    expect(parsed.password).toBe('SecurePassword123!');

    expect(
      LoginRequestSchema.safeParse({ email: 'owner@studio.com', password: 'short' }).success
    ).toBe(false);
  });

  it('validates AuthResponseSchema ensuring clean user and membership array', () => {
    const authResponse = {
      user: {
        id: 'usr_abc123',
        email: 'owner@studio.com',
        name: 'Studio Owner',
        status: 'active',
        createdAt: '2026-11-21T10:00:00.000Z',
        updatedAt: '2026-11-21T10:00:00.000Z',
      },
      memberships: [
        {
          userId: 'usr_abc123',
          studioId: 'studio-koramangala',
          role: 'studio_owner',
          status: 'active',
          createdAt: '2026-11-21T10:00:00.000Z',
        },
      ],
    };

    const parsed = AuthResponseSchema.parse(authResponse);
    expect(parsed.user.email).toBe('owner@studio.com');
    expect(parsed.memberships).toHaveLength(1);
    expect(parsed.memberships[0].role).toBe('studio_owner');
    expect((parsed.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});
