import { describe, expect, it } from 'vitest';
import {
  AdminOverrideSubscriptionRequestSchema,
  AdminOverrideSubscriptionResponseSchema,
  ListPlatformAuditLogsResponseSchema,
  ListPlatformStudiosQuerySchema,
  ListPlatformStudiosResponseSchema,
  PlatformAuditEntrySchema,
  PlatformMetricsResponseSchema,
  PlatformStudioDetailsResponseSchema,
  PlatformStudioItemSchema,
  UpdatePlatformStudioStatusRequestSchema,
} from './platform-admin.js';

describe('platform-admin contracts', () => {
  it('validates PlatformMetricsResponseSchema', () => {
    const valid = {
      totalStudios: 12,
      activeStudios: 10,
      onboardingStudios: 1,
      suspendedStudios: 1,
      totalOrdersCount: 154,
      totalPaidVolumeMinor: 450000,
      currency: 'INR',
    };
    expect(PlatformMetricsResponseSchema.parse(valid)).toEqual(valid);

    const negative = { ...valid, totalStudios: -1 };
    expect(() => PlatformMetricsResponseSchema.parse(negative)).toThrow();
  });

  it('validates PlatformStudioItemSchema', () => {
    const valid = {
      id: 'studio-central',
      slug: 'studio-central',
      name: 'Studio Central',
      status: 'active',
      ownerUserId: 'user-123',
      contactPhone: '+919876543210',
      contactEmail: 'owner@central.in',
      isAcceptingOrders: true,
      printerCount: 3,
      payment: {
        enableCounterPayment: true,
        enableOnlinePayment: true,
        isRazorpayConfirmed: true,
      },
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-23T10:00:00.000Z',
    };
    expect(PlatformStudioItemSchema.parse(valid)).toEqual(valid);

    const invalidSlug = { ...valid, slug: 'INVALID SLUG!' };
    expect(() => PlatformStudioItemSchema.parse(invalidSlug)).toThrow();
  });

  it('validates ListPlatformStudiosQuerySchema', () => {
    const parsed = ListPlatformStudiosQuerySchema.parse({
      status: 'active',
      limit: '25',
      skip: '10',
      search: 'central',
    });
    expect(parsed).toEqual({
      status: 'active',
      limit: 25,
      skip: 10,
      search: 'central',
    });
  });

  it('validates ListPlatformStudiosResponseSchema', () => {
    const valid = {
      studios: [
        {
          id: 'studio-alpha',
          slug: 'studio-alpha',
          name: 'Studio Alpha',
          status: 'pending_review',
          createdAt: '2026-11-20T10:00:00.000Z',
          updatedAt: '2026-11-23T10:00:00.000Z',
        },
      ],
      total: 1,
    };
    expect(ListPlatformStudiosResponseSchema.parse(valid)).toEqual(valid);
  });

  it('validates UpdatePlatformStudioStatusRequestSchema', () => {
    const valid = {
      status: 'suspended',
      reason: 'Violation of Terms of Service',
    };
    expect(UpdatePlatformStudioStatusRequestSchema.parse(valid)).toEqual(valid);

    expect(() =>
      UpdatePlatformStudioStatusRequestSchema.parse({
        status: 'invalid_status',
      })
    ).toThrow();
  });

  it('validates PlatformAuditEntrySchema and ListPlatformAuditLogsResponseSchema', () => {
    const entry = {
      id: 'audit-001',
      timestamp: '2026-11-23T12:00:00.000Z',
      actorId: 'admin-super',
      action: 'studio.suspend',
      targetType: 'studio',
      targetId: 'studio-alpha',
      reason: 'Suspension reason provided',
      metadata: { previousStatus: 'active' },
    };
    expect(PlatformAuditEntrySchema.parse(entry)).toEqual(entry);

    const list = {
      auditLogs: [entry],
      total: 1,
    };
    expect(ListPlatformAuditLogsResponseSchema.parse(list)).toEqual(list);
  });

  it('validates PlatformStudioDetailsResponseSchema with subscription and printStats', () => {
    const details = {
      studio: {
        id: 'studio-alpha',
        slug: 'studio-alpha',
        name: 'Studio Alpha',
        status: 'active',
        currency: 'INR',
        maxActivePrinters: 2,
        autoApproveOrders: false,
        createdAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-23T10:00:00.000Z',
      },
      owner: null,
      printers: [],
      devices: [],
      subscription: {
        plan: 'quarterly',
        status: 'active',
        startsAt: '2026-11-20T10:00:00.000Z',
        expiresAt: '2027-02-18T10:00:00.000Z',
      },
      printStats: {
        totalCompletedPrints: 15,
        colorPrints: 5,
        bwPrints: 10,
      },
    };
    expect(PlatformStudioDetailsResponseSchema.parse(details)).toEqual(details);
  });

  it('validates AdminOverrideSubscriptionRequestSchema and ResponseSchema', () => {
    const validReq = {
      plan: 'quarterly',
      durationDays: 90,
      reason: 'Promotional grant for launch partner',
    };
    expect(AdminOverrideSubscriptionRequestSchema.parse(validReq)).toEqual(validReq);

    const validRes = {
      success: true,
      subscription: {
        plan: 'quarterly',
        status: 'active',
        startsAt: '2026-11-20T10:00:00.000Z',
        expiresAt: '2027-02-18T10:00:00.000Z',
        updatedAt: '2026-11-24T10:00:00.000Z',
      },
    };
    expect(AdminOverrideSubscriptionResponseSchema.parse(validRes)).toEqual(validRes);
  });
});
