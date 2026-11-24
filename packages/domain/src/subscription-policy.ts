import {
  OrderEntitlementReasonCode,
  OrderPaymentStatus,
  PLAN_DURATIONS_DAYS,
  SubscriptionPlanId,
  SubscriptionStatus,
} from '@snapprint/contracts';

const MS_PER_DAY = 86_400_000;

function parseDateInput(value: Date | string, fieldName: string): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid timestamp provided for ${fieldName}: "${String(value)}"`);
  }
  return d;
}

/**
 * Calculates deterministic subscription expiration using approved fixed-day duration.
 * Decision 3: Fixed-Day Duration (30, 90, 180, 365 days).
 */
export function calculateSubscriptionExpiry(
  startDate: Date | string,
  plan: SubscriptionPlanId
): Date {
  const start = parseDateInput(startDate, 'startDate');
  const durationDays = PLAN_DURATIONS_DAYS[plan];
  if (!durationDays) {
    throw new Error(`Unknown subscription plan: "${String(plan)}"`);
  }
  return new Date(start.getTime() + durationDays * MS_PER_DAY);
}

/**
 * Checks subscription validity using zero-day grace period policy.
 * Decision 2: Zero-Day Grace Period.
 * Exact boundary: active until and including exact expiresAt millisecond; expired immediately after.
 */
export function isSubscriptionActive(
  expiresAt: Date | string | null | undefined,
  now: Date | string = new Date()
): boolean {
  if (!expiresAt) return false;
  try {
    const exp = parseDateInput(expiresAt, 'expiresAt');
    const current = parseDateInput(now, 'now');
    return current.getTime() <= exp.getTime();
  } catch {
    return false;
  }
}

/**
 * Derives subscription status ('active' | 'expired').
 */
export function deriveSubscriptionStatus(
  expiresAt: Date | string | null | undefined,
  now: Date | string = new Date()
): SubscriptionStatus {
  return isSubscriptionActive(expiresAt, now) ? 'active' : 'expired';
}

export interface SubscriptionExtensionResult {
  previousExpiresAt: string;
  newExpiresAt: string;
  durationDays: number;
}

/**
 * Extends a subscription deterministically.
 * If currently active, extends from existing expiry timestamp.
 * If already expired or non-existent, starts from the renewal timestamp.
 */
export function extendSubscription(
  currentExpiresAt: Date | string | null | undefined,
  plan: SubscriptionPlanId,
  renewalTimestamp: Date | string = new Date()
): SubscriptionExtensionResult {
  const renewal = parseDateInput(renewalTimestamp, 'renewalTimestamp');
  const durationDays = PLAN_DURATIONS_DAYS[plan];
  if (!durationDays) {
    throw new Error(`Unknown subscription plan: "${String(plan)}"`);
  }

  let baseTime = renewal.getTime();
  let prevExpiryIso: string | null = null;

  if (currentExpiresAt) {
    const currentExp = parseDateInput(currentExpiresAt, 'currentExpiresAt');
    prevExpiryIso = currentExp.toISOString();
    if (currentExp.getTime() > baseTime) {
      baseTime = currentExp.getTime();
    }
  }

  const newExpiry = new Date(baseTime + durationDays * MS_PER_DAY);

  return {
    previousExpiresAt: prevExpiryIso ?? renewal.toISOString(),
    newExpiresAt: newExpiry.toISOString(),
    durationDays,
  };
}

export interface OrderFulfillmentEntitlementParams {
  paymentStatus: OrderPaymentStatus;
  paymentCapturedAt?: Date | string | null;
  subscriptionExpiresAt: Date | string;
}

export interface OrderFulfillmentEntitlementDecision {
  allowed: boolean;
  reason: OrderEntitlementReasonCode;
}

/**
 * Evaluates whether an order is entitled to physical fulfillment post subscription expiry.
 * Decision 4: Honor Legitimate Paid Orders.
 * Rule: Orders legitimately captured before or at subscription expiry are entitled to print,
 * regardless of when webhook arrived or whether subscription has since lapsed.
 */
export function evaluateOrderFulfillmentEntitlement(
  params: OrderFulfillmentEntitlementParams
): OrderFulfillmentEntitlementDecision {
  if (params.paymentStatus !== 'PAID') {
    return { allowed: false, reason: 'ORDER_NOT_PAID' };
  }

  if (params.paymentCapturedAt == null || params.paymentCapturedAt === '') {
    return { allowed: false, reason: 'MISSING_PAYMENT_TIMESTAMP' };
  }

  const capturedDate =
    params.paymentCapturedAt instanceof Date
      ? params.paymentCapturedAt
      : new Date(params.paymentCapturedAt);

  if (Number.isNaN(capturedDate.getTime())) {
    return { allowed: false, reason: 'INVALID_PAYMENT_TIMESTAMP' };
  }

  const expiryDate = parseDateInput(params.subscriptionExpiresAt, 'subscriptionExpiresAt');

  // Exact boundary: capturedAt <= expiresAt is entitled
  if (capturedDate.getTime() <= expiryDate.getTime()) {
    return { allowed: true, reason: 'PAID_BEFORE_EXPIRY' };
  }

  return { allowed: false, reason: 'PAID_AFTER_EXPIRY' };
}

export interface StorefrontCheckoutAvailabilityParams {
  studioStatus: string;
  isAcceptingOrders: boolean;
  hasActiveSubscription: boolean;
  hasOnlineAgent: boolean;
  hasActivePrinter: boolean;
}

export interface StorefrontCheckoutAvailabilityDecision {
  allowed: boolean;
  reason:
    | 'AVAILABLE'
    | 'STUDIO_INACTIVE'
    | 'STUDIO_PAUSED'
    | 'SUBSCRIPTION_EXPIRED'
    | 'AGENT_OFFLINE'
    | 'NO_ACTIVE_PRINTER';
}

/**
 * Pure domain representation for storefront checkout availability.
 * Decision 1: Storefront Hardware/Agent Outage Policy (Hard Block Checkout).
 */
export function evaluateStorefrontCheckoutAvailability(
  params: StorefrontCheckoutAvailabilityParams
): StorefrontCheckoutAvailabilityDecision {
  if (params.studioStatus !== 'active') {
    return { allowed: false, reason: 'STUDIO_INACTIVE' };
  }

  if (!params.isAcceptingOrders) {
    return { allowed: false, reason: 'STUDIO_PAUSED' };
  }

  if (!params.hasActiveSubscription) {
    return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' };
  }

  if (!params.hasOnlineAgent) {
    return { allowed: false, reason: 'AGENT_OFFLINE' };
  }

  if (!params.hasActivePrinter) {
    return { allowed: false, reason: 'NO_ACTIVE_PRINTER' };
  }

  return { allowed: true, reason: 'AVAILABLE' };
}
