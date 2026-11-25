import { describe, expect, it } from 'vitest';
import {
  PLAN_DURATIONS_DAYS,
  SubscriptionPlanIdSchema,
  SubscriptionStatusSchema,
  StudioSubscriptionRecordSchema,
  OrderEntitlementEvaluationSchema,
  OrderEntitlementResultSchema,
  AgentDownloadMetadataSchema,
  SubscriptionPlanDefinitionSchema,
  CreateSubscriptionPlanRequestSchema,
  UpdateSubscriptionPlanRequestSchema,
  SubscriptionNotificationRequestSchema,
} from './index.js';

describe('Subscription Contracts SSOT', () => {
  it('enforces exact approved plan durations in fixed days', () => {
    expect(PLAN_DURATIONS_DAYS.free).toBe(30);
    expect(PLAN_DURATIONS_DAYS.quarterly).toBe(90);
    expect(PLAN_DURATIONS_DAYS.half_yearly).toBe(180);
    expect(PLAN_DURATIONS_DAYS.yearly).toBe(365);
  });

  it('validates subscription plan identifiers', () => {
    expect(SubscriptionPlanIdSchema.parse('free')).toBe('free');
    expect(SubscriptionPlanIdSchema.parse('quarterly')).toBe('quarterly');
    expect(SubscriptionPlanIdSchema.parse('half_yearly')).toBe('half_yearly');
    expect(SubscriptionPlanIdSchema.parse('yearly')).toBe('yearly');
    expect(() => SubscriptionPlanIdSchema.parse('monthly')).toThrow();
    expect(() => SubscriptionPlanIdSchema.parse('lifetime')).toThrow();
  });

  it('validates zero-grace subscription statuses', () => {
    expect(SubscriptionStatusSchema.parse('active')).toBe('active');
    expect(SubscriptionStatusSchema.parse('expired')).toBe('expired');
    expect(() => SubscriptionStatusSchema.parse('grace_period')).toThrow();
    expect(() => SubscriptionStatusSchema.parse('suspended')).toThrow();
  });

  it('validates StudioSubscriptionRecordSchema structure', () => {
    const valid = {
      studioId: 'std_01j7b8d4k3m2n1p0q9r8s7t6u5',
      plan: 'quarterly',
      status: 'active',
      startsAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(StudioSubscriptionRecordSchema.parse(valid)).toEqual(valid);
  });

  it('validates OrderEntitlementEvaluationSchema', () => {
    const evalData = {
      orderId: 'ord_123456',
      paymentStatus: 'PAID',
      paymentCapturedAt: '2026-03-31T23:59:59.000Z',
      subscriptionExpiresAt: '2026-04-01T00:00:00.000Z',
    };
    expect(OrderEntitlementEvaluationSchema.parse(evalData)).toEqual(evalData);
  });

  it('validates OrderEntitlementResultSchema', () => {
    const resData = {
      allowed: true,
      reason: 'PAID_BEFORE_EXPIRY' as const,
      evaluatedAt: '2026-04-01T00:00:00.000Z',
    };
    expect(OrderEntitlementResultSchema.parse(resData)).toEqual(resData);
  });

  it('validates AgentDownloadMetadataSchema', () => {
    const validMeta = {
      version: '1.0.0',
      installerName: 'SnapPrint-Print-Agent.msi' as const,
      downloadUrl:
        'https://github.com/snapprint/snapprint/releases/download/v1.0.0/SnapPrint-Print-Agent.msi',
      sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      sizeBytes: 45678901,
      releaseDate: '2026-11-24T12:00:00.000Z',
    };
    expect(AgentDownloadMetadataSchema.parse(validMeta)).toEqual(validMeta);

    // Invalid hash length
    expect(() =>
      AgentDownloadMetadataSchema.parse({
        ...validMeta,
        sha256: 'tooshort',
      })
    ).toThrow();

    // Invalid installer name
    expect(() =>
      AgentDownloadMetadataSchema.parse({
        ...validMeta,
        installerName: 'other.exe',
      })
    ).toThrow();
  });

  it('validates SubscriptionPlanDefinitionSchema, Create, and Update schemas', () => {
    const validPlan = {
      id: 'custom_31_day_plan',
      name: 'Promotional 31-Day Plan',
      durationDays: 31,
      priceRupees: 499,
      category: 'paid' as const,
      intervalMonths: 1,
      isActive: true,
      description: 'Exclusive partner tier',
    };
    expect(SubscriptionPlanDefinitionSchema.parse(validPlan)).toEqual(validPlan);

    const createReq = CreateSubscriptionPlanRequestSchema.parse({
      id: 'plan_starter_32',
      name: 'Starter Plan (32 Days)',
      durationDays: '32',
      priceRupees: '0',
      category: 'free',
      intervalMonths: '1',
    });
    expect(createReq.durationDays).toBe(32);
    expect(createReq.priceRupees).toBe(0);
    expect(createReq.category).toBe('free');

    const updateReq = UpdateSubscriptionPlanRequestSchema.parse({
      durationDays: '35',
      priceRupees: '99',
    });
    expect(updateReq.durationDays).toBe(35);
    expect(updateReq.priceRupees).toBe(99);

    const notifReq = SubscriptionNotificationRequestSchema.parse({});
    expect(notifReq.type).toBe('expiry_reminder');
  });
});
