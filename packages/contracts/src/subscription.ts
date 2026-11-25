import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';
import { OrderPaymentStatusSchema } from './payment.js';

/**
 * Single Source of Truth (SSOT) for subscription plan identifiers.
 * Feature parity is 100% across all tiers; only duration and pricing differ.
 */
export const SubscriptionPlanIds = ['free', 'quarterly', 'half_yearly', 'yearly'] as const;
export const SubscriptionPlanIdSchema = z.enum(SubscriptionPlanIds);
export type SubscriptionPlanId = z.infer<typeof SubscriptionPlanIdSchema>;

/**
 * Approved fixed-day duration mapping (Decision 3: Fixed-Day Duration).
 * Fixed days are invariant under leap years and 28/30/31-day calendar variances.
 */
export const PLAN_DURATIONS_DAYS: Readonly<Record<SubscriptionPlanId, number>> = Object.freeze({
  free: 30,
  quarterly: 90,
  half_yearly: 180,
  yearly: 365,
});

/**
 * Approved subscription status (Decision 2: Zero-Day Grace Period).
 * Exactly two states: active or expired. No grace period.
 */
export const SubscriptionStatuses = ['active', 'expired'] as const;
export const SubscriptionStatusSchema = z.enum(SubscriptionStatuses);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

/**
 * Persistent studio subscription record contract.
 */
export const StudioSubscriptionRecordSchema = z.object({
  studioId: StudioIdSchema,
  plan: SubscriptionPlanIdSchema,
  status: SubscriptionStatusSchema,
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StudioSubscriptionRecord = z.infer<typeof StudioSubscriptionRecordSchema>;

/**
 * Pure entitlement decision reason codes (Decision 4: Honor Paid Orders).
 */
export const OrderEntitlementReasonCodes = [
  'PAID_BEFORE_EXPIRY',
  'ORDER_NOT_PAID',
  'MISSING_PAYMENT_TIMESTAMP',
  'INVALID_PAYMENT_TIMESTAMP',
  'PAID_AFTER_EXPIRY',
] as const;
export const OrderEntitlementReasonCodeSchema = z.enum(OrderEntitlementReasonCodes);
export type OrderEntitlementReasonCode = z.infer<typeof OrderEntitlementReasonCodeSchema>;

/**
 * Evaluation payload for paid order fulfillment entitlement.
 */
export const OrderEntitlementEvaluationSchema = z.object({
  orderId: z.string().min(1),
  paymentStatus: OrderPaymentStatusSchema,
  paymentCapturedAt: z.string().datetime().optional().nullable(),
  subscriptionExpiresAt: z.string().datetime(),
});
export type OrderEntitlementEvaluation = z.infer<typeof OrderEntitlementEvaluationSchema>;

/**
 * Result contract of pure paid-order entitlement evaluation.
 */
export const OrderEntitlementResultSchema = z.object({
  allowed: z.boolean(),
  reason: OrderEntitlementReasonCodeSchema,
  evaluatedAt: z.string().datetime(),
});
export type OrderEntitlementResult = z.infer<typeof OrderEntitlementResultSchema>;

/**
 * Default configurable subscription pricing in paise (minor currency).
 * 1-month free trial = 0 paise.
 */
export const DEFAULT_PLAN_PRICES_PAISE: Readonly<Record<SubscriptionPlanId, number>> =
  Object.freeze({
    free: 0,
    quarterly: 99900,
    half_yearly: 179900,
    yearly: 299900,
  });

/**
 * Subscription order record for gateway renewal tracking.
 */
export const SubscriptionOrderRecordSchema = z.object({
  subscriptionOrderId: z.string().min(1),
  studioId: StudioIdSchema,
  plan: SubscriptionPlanIdSchema,
  durationDays: z.number().int().positive(),
  amountMinor: z.number().int().nonnegative(),
  currency: z.literal('INR'),
  gatewayOrderId: z.string().min(1),
  gatewayPaymentId: z.string().optional(),
  status: z.enum(['CREATED', 'PAID', 'FAILED']),
  capturedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubscriptionOrderRecord = z.infer<typeof SubscriptionOrderRecordSchema>;

export const CreateSubscriptionOrderRequestSchema = z.object({
  plan: SubscriptionPlanIdSchema,
});
export type CreateSubscriptionOrderRequest = z.infer<typeof CreateSubscriptionOrderRequestSchema>;

/**
 * Subscription Plan Catalog & Management (Dynamic Plan Designer SSOT)
 */
export const SubscriptionPlanCategorySchema = z.enum(['free', 'paid']);
export type SubscriptionPlanCategory = z.infer<typeof SubscriptionPlanCategorySchema>;

export const SubscriptionPlanDefinitionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(100),
  durationDays: z.number().int().positive().max(3650),
  priceRupees: z.number().int().nonnegative().max(1000000),
  category: SubscriptionPlanCategorySchema,
  intervalMonths: z.number().int().positive().max(120).optional(),
  isActive: z.boolean().default(true),
  description: z.string().trim().max(300).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type SubscriptionPlanDefinition = z.infer<typeof SubscriptionPlanDefinitionSchema>;

export const CreateSubscriptionPlanRequestSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/i, 'Plan ID must be alphanumeric'),
  name: z.string().trim().min(1).max(100),
  durationDays: z.coerce.number().int().positive().max(3650),
  priceRupees: z.coerce.number().int().nonnegative().max(1000000),
  category: SubscriptionPlanCategorySchema,
  intervalMonths: z.coerce.number().int().positive().max(120).optional(),
  isActive: z.boolean().default(true).optional(),
  description: z.string().trim().max(300).optional(),
});
export type CreateSubscriptionPlanRequest = z.infer<typeof CreateSubscriptionPlanRequestSchema>;

export const UpdateSubscriptionPlanRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  durationDays: z.coerce.number().int().positive().max(3650).optional(),
  priceRupees: z.coerce.number().int().nonnegative().max(1000000).optional(),
  category: SubscriptionPlanCategorySchema.optional(),
  intervalMonths: z.coerce.number().int().positive().max(120).optional(),
  isActive: z.boolean().optional(),
  description: z.string().trim().max(300).optional(),
});
export type UpdateSubscriptionPlanRequest = z.infer<typeof UpdateSubscriptionPlanRequestSchema>;

export const SubscriptionNotificationRequestSchema = z.object({
  type: z.enum(['expiry_reminder', 'plan_update', 'custom']).default('expiry_reminder'),
  message: z.string().trim().max(500).optional(),
});
export type SubscriptionNotificationRequest = z.infer<typeof SubscriptionNotificationRequestSchema>;

