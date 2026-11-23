import { describe, expect, it } from 'vitest';
import {
  ListPlatformAuditLogsResponseSchema,
  ListPlatformStudiosQuerySchema,
  ListPlatformStudiosResponseSchema,
  PlatformAuditEntrySchema,
  PlatformMetricsResponseSchema,
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
});
