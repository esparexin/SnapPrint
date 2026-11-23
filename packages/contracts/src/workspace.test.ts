import { describe, expect, it } from 'vitest';
import {
  InviteStaffRequestSchema,
  PrintVolumeMetricsSchema,
  RevokeStaffResponseSchema,
  StaffMemberSchema,
  StudioMetricsResponseSchema,
  UpdateStudioProfileRequestSchema,
} from './workspace.js';

describe('Workspace Contracts', () => {
  describe('StudioMetricsResponseSchema', () => {
    it('validates standalone PrintVolumeMetricsSchema', () => {
      const volume = { bwPages: 10, colorPages: 2, totalSheets: 7 };
      expect(PrintVolumeMetricsSchema.safeParse(volume).success).toBe(true);
    });

    it('validates a valid operational metrics payload', () => {
      const valid = {
        todayOrdersCount: 14,
        todayPaidCollectionsMinor: 48000,
        pendingOrdersCount: 2,
        printVolume: {
          bwPages: 92,
          colorPages: 4,
          totalSheets: 56,
        },
        currency: 'INR',
      };

      const result = StudioMetricsResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todayOrdersCount).toBe(14);
        expect(result.data.todayPaidCollectionsMinor).toBe(48000);
      }
    });

    it('rejects negative numbers for metrics', () => {
      const invalid = {
        todayOrdersCount: -1,
        todayPaidCollectionsMinor: 0,
        pendingOrdersCount: 0,
        printVolume: { bwPages: 0, colorPages: 0, totalSheets: 0 },
      };

      expect(StudioMetricsResponseSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('StaffMemberSchema & Invitation', () => {
    it('validates a valid staff member entity', () => {
      const staff = {
        id: 'mem_12345',
        userId: 'usr_staff1',
        studioId: 'std_main',
        email: 'staff@example.com',
        name: 'Ramesh Staff',
        role: 'studio_staff',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const parsed = StaffMemberSchema.safeParse(staff);
      expect(parsed.success).toBe(true);
    });

    it('validates an invitation request', () => {
      const req = {
        email: 'NEW_STAFF@Domain.COM  ',
        name: 'New Helper',
      };

      const parsed = InviteStaffRequestSchema.safeParse(req);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe('new_staff@domain.com');
        expect(parsed.data.role).toBe('studio_staff');
      }
    });

    it('rejects invalid email for staff invitation', () => {
      const bad = { email: 'not-an-email' };
      expect(InviteStaffRequestSchema.safeParse(bad).success).toBe(false);
    });

    it('validates revoke staff response', () => {
      const resp = {
        success: true,
        membershipId: 'mem_123',
        status: 'revoked',
      };
      expect(RevokeStaffResponseSchema.safeParse(resp).success).toBe(true);
    });
  });

  describe('UpdateStudioProfileRequestSchema', () => {
    it('validates profile update fields', () => {
      const update = {
        tagline: 'Fast Digital Prints',
        contactPhone: '+91 98765 43210',
        address: 'Main Road Hanamkonda',
        isAcceptingOrders: false,
      };

      const parsed = UpdateStudioProfileRequestSchema.safeParse(update);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isAcceptingOrders).toBe(false);
      }
    });
  });
});
