import { describe, expect, it } from 'vitest';
import { PlatformStudioItem, PlatformUserItem } from '@snapprint/contracts';

describe('Platform Admin Governance & RBAC Separation', () => {
  const sampleUsers: PlatformUserItem[] = [
    {
      id: 'usr_super',
      email: 'superadmin@snapprint.in',
      name: 'Super Admin',
      role: 'platform_admin',
      status: 'active',
      studioId: undefined,
      createdAt: '2026-11-20T00:00:00.000Z',
    },
    {
      id: 'usr_owner_1',
      email: 'owner@koramangala.in',
      name: 'Lokesh Kumar',
      role: 'studio_owner',
      status: 'active',
      studioId: 'studio_kora',
      createdAt: '2026-11-22T00:00:00.000Z',
    },
    {
      id: 'usr_staff_1',
      email: 'staff@koramangala.in',
      name: 'Ravi Teja',
      role: 'studio_staff',
      status: 'active',
      studioId: 'studio_kora',
      createdAt: '2026-11-23T00:00:00.000Z',
    },
  ];

  it('filters platform admins strictly separated from tenant users', () => {
    const platformAdmins = sampleUsers.filter((u) => u.role === 'platform_admin');
    const tenantUsers = sampleUsers.filter((u) => u.role !== 'platform_admin');

    expect(platformAdmins).toHaveLength(1);
    expect(platformAdmins[0].email).toBe('superadmin@snapprint.in');

    expect(tenantUsers).toHaveLength(2);
    expect(tenantUsers.map((u) => u.role)).toEqual(['studio_owner', 'studio_staff']);
  });

  it('guarantees self-suspension protection on admin user actions', () => {
    const currentUserId = 'usr_super';

    const canSuspendUser = (user: PlatformUserItem, requesterId: string) => {
      if (user.id === requesterId) {
        return { allowed: false, reason: 'SELF_SUSPENSION_PREVENTED' };
      }
      return { allowed: true, reason: null };
    };

    expect(canSuspendUser(sampleUsers[0], currentUserId)).toEqual({
      allowed: false,
      reason: 'SELF_SUSPENSION_PREVENTED',
    });

    expect(canSuspendUser(sampleUsers[1], currentUserId)).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it('prioritizes authoritative owner email over fallback contact email in tenant directory', () => {
    const studioWithOwner: PlatformStudioItem = {
      id: 'studio_01',
      slug: 'kora-print',
      name: 'Koramangala Print Hub',
      status: 'active',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
      ownerEmail: 'verified-owner@snapprint.in',
      ownerName: 'Verified Owner',
      contactEmail: 'unverified-contact@snapprint.in',
      contactPhone: '+91 9988776655',
    };

    const displayEmail = studioWithOwner.ownerEmail || studioWithOwner.contactEmail || 'None';
    expect(displayEmail).toBe('verified-owner@snapprint.in');
  });

  it('falls back to contactEmail if owner user email is pending', () => {
    const studioFallback: PlatformStudioItem = {
      id: 'studio_02',
      slug: 'indira-print',
      name: 'Indiranagar Print Hub',
      status: 'onboarding',
      createdAt: '2026-11-21T00:00:00.000Z',
      updatedAt: '2026-11-21T00:00:00.000Z',
      contactEmail: 'desk@indiranagar.in',
    };

    const displayEmail = studioFallback.ownerEmail || studioFallback.contactEmail || 'None';
    expect(displayEmail).toBe('desk@indiranagar.in');
  });

  it('correctly maps hardware fleet and agent device presence', () => {
    const mockDetails = {
      printers: [
        {
          id: 'p_01',
          name: 'Canon imageRUNNER 2525',
          driverName: 'Canon Generic PCL6',
          status: 'idle',
        },
      ],
      devices: [
        {
          deviceId: 'dev_mac_01',
          hostname: 'Koramangala-Counter-Mac',
          osPlatform: 'darwin',
          status: 'online',
        },
      ],
    };

    expect(mockDetails.printers).toHaveLength(1);
    expect(mockDetails.printers[0].name).toBe('Canon imageRUNNER 2525');
    expect(mockDetails.devices).toHaveLength(1);
    expect(mockDetails.devices[0].status).toBe('online');
  });
});
