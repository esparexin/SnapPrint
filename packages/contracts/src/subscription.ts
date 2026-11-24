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
