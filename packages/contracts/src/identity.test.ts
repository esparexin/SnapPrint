import { describe, expect, it } from 'vitest';
import { UserMembershipSchema, UserRoleSchema } from './identity.js';

describe('Identity & Roles Contracts', () => {
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
});
