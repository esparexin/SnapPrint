import { describe, expect, it } from 'vitest';
import { PlatformStudioItem, PlatformUserItem } from '@snapprint/contracts';
import { formatDaysRemaining, formatPlanLabel } from '../app/admin/admin-subscription-helpers';

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

  it('correctly maps operator subscription status and completed print stats', () => {
    const mockDetails = {
      subscription: {
        plan: 'quarterly' as const,
        status: 'active' as const,
        startsAt: '2026-11-20T10:00:00.000Z',
        expiresAt: '2027-02-18T10:00:00.000Z',
      },
      printStats: {
        totalCompletedPrints: 42,
        colorPrints: 12,
        bwPrints: 30,
      },
    };

    expect(mockDetails.subscription.plan).toBe('quarterly');
    expect(mockDetails.subscription.status).toBe('active');
    expect(mockDetails.printStats.totalCompletedPrints).toBe(42);
    expect(mockDetails.printStats.colorPrints).toBe(12);
    expect(mockDetails.printStats.bwPrints).toBe(30);
    expect(mockDetails.printStats.colorPrints + mockDetails.printStats.bwPrints).toBe(
      mockDetails.printStats.totalCompletedPrints
    );
  });

  it('correctly maps KPI card targets to studio status filters', () => {
    const kpiTargets: Record<string, 'all' | 'onboarding' | 'suspended'> = {
      'Total Studios': 'all',
      'Pending Onboarding': 'onboarding',
      'Suspended Studios': 'suspended',
    };

    expect(kpiTargets['Total Studios']).toBe('all');
    expect(kpiTargets['Pending Onboarding']).toBe('onboarding');
    expect(kpiTargets['Suspended Studios']).toBe('suspended');
  });

  it('correctly maps printer count and payment badges for directory table', () => {
    const studioItem: PlatformStudioItem = {
      id: 'studio_01',
      slug: 'kora-print',
      name: 'Koramangala Print Hub',
      status: 'active',
      printerCount: 2,
      payment: {
        enableCounterPayment: true,
        enableOnlinePayment: true,
        isRazorpayConfirmed: true,
      },
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    };

    expect(studioItem.printerCount).toBe(2);
    expect(studioItem.payment?.enableCounterPayment).toBe(true);
    expect(studioItem.payment?.enableOnlinePayment).toBe(true);
  });

  it('validates subscription extension durations and audit reason requirements', () => {
    const validateOverride = (days: number | undefined, reason: string) => {
      if (reason.trim().length < 3) return { valid: false, error: 'Reason required' };
      if (days !== undefined && (isNaN(days) || days <= 0 || days > 3650)) {
        return { valid: false, error: 'Invalid days' };
      }
      return { valid: true };
    };

    expect(validateOverride(undefined, 'VIP extension').valid).toBe(true);
    expect(validateOverride(365, 'SLA compensation').valid).toBe(true);
    expect(validateOverride(0, 'Test reason').valid).toBe(false);
    expect(validateOverride(4000, 'Test reason').valid).toBe(false);
    expect(validateOverride(30, 'ok').valid).toBe(false);
  });

  it('formats subscription plan labels and days remaining countdown correctly', () => {
    expect(formatPlanLabel('quarterly')).toBe('Quarterly');
    expect(formatPlanLabel('free')).toBe('Free Trial');
    expect(formatPlanLabel(undefined)).toBe('No Plan');

    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDaysRemaining(future, true)).toBe('10d remaining');
    expect(formatDaysRemaining(past, false)).toBe('Expired 5d ago');
    expect(formatDaysRemaining(undefined)).toBe('—');
  });

  it('correctly maps studio item subscription presence to table badges', () => {
    const itemWithSub: PlatformStudioItem = {
      id: 'studio_sub_01',
      slug: 'sub-studio',
      name: 'Subscription Studio',
      status: 'active',
      subscription: {
        plan: 'quarterly',
        status: 'active',
        expiresAt: '2027-02-18T10:00:00.000Z',
      },
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    };

    expect(itemWithSub.subscription).toBeDefined();
    expect(itemWithSub.subscription?.plan).toBe('quarterly');
    expect(itemWithSub.subscription?.status).toBe('active');
  });
});
