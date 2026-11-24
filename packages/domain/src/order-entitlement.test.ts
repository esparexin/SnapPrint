import { describe, expect, it } from 'vitest';
import {
  evaluateOrderFulfillmentEntitlement,
  evaluateStorefrontCheckoutAvailability,
} from './subscription-policy.js';

describe('Order Entitlement & Storefront Availability Domain SSOT', () => {
  describe('Decision 4: Paid Order Fulfillment Entitlement Post-Expiry', () => {
    const subscriptionExpiresAt = '2026-06-01T00:00:00.000Z';
    const expMs = new Date(subscriptionExpiresAt).getTime();

    it('allows fulfillment when payment was captured before expiry', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: new Date(expMs - 60_000).toISOString(),
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('PAID_BEFORE_EXPIRY');
    });

    it('allows fulfillment at the exact expiration millisecond', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: subscriptionExpiresAt,
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('PAID_BEFORE_EXPIRY');
    });

    it('denies fulfillment when payment was captured after expiry', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: new Date(expMs + 1000).toISOString(),
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('PAID_AFTER_EXPIRY');
    });

    it('denies fulfillment for unpaid orders regardless of timestamps', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'UNPAID',
        paymentCapturedAt: new Date(expMs - 60_000).toISOString(),
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('ORDER_NOT_PAID');
    });

    it('denies fulfillment for partially paid orders', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PARTIALLY_PAID',
        paymentCapturedAt: new Date(expMs - 60_000).toISOString(),
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('ORDER_NOT_PAID');
    });

    it('denies fulfillment when payment timestamp is missing', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: null,
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('MISSING_PAYMENT_TIMESTAMP');
    });

    it('denies fulfillment when payment timestamp is invalid', () => {
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: 'invalid-date-string',
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('INVALID_PAYMENT_TIMESTAMP');
    });

    it('protects delayed webhook: payment captured before expiry remains entitled', () => {
      const preExpiryCapture = new Date(expMs - 300_000).toISOString();
      const decision = evaluateOrderFulfillmentEntitlement({
        paymentStatus: 'PAID',
        paymentCapturedAt: preExpiryCapture,
        subscriptionExpiresAt,
      });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('PAID_BEFORE_EXPIRY');
    });
  });

  describe('Decision 1: Storefront Hardware & Outage Policy Representation', () => {
    const baseParams = {
      studioStatus: 'active',
      isAcceptingOrders: true,
      hasActiveSubscription: true,
      hasOnlineAgent: true,
      hasActivePrinter: true,
    };

    it('allows checkout when all infrastructure is online and active', () => {
      expect(evaluateStorefrontCheckoutAvailability(baseParams)).toEqual({
        allowed: true,
        reason: 'AVAILABLE',
      });
    });

    it('hard blocks checkout when desktop agent is offline', () => {
      expect(
        evaluateStorefrontCheckoutAvailability({
          ...baseParams,
          hasOnlineAgent: false,
        })
      ).toEqual({
        allowed: false,
        reason: 'AGENT_OFFLINE',
      });
    });

    it('hard blocks checkout when no printer is assigned or active', () => {
      expect(
        evaluateStorefrontCheckoutAvailability({
          ...baseParams,
          hasActivePrinter: false,
        })
      ).toEqual({
        allowed: false,
        reason: 'NO_ACTIVE_PRINTER',
      });
    });

    it('hard blocks checkout when studio subscription is expired', () => {
      expect(
        evaluateStorefrontCheckoutAvailability({
          ...baseParams,
          hasActiveSubscription: false,
        })
      ).toEqual({
        allowed: false,
        reason: 'SUBSCRIPTION_EXPIRED',
      });
    });

    it('blocks checkout when studio is paused by merchant', () => {
      expect(
        evaluateStorefrontCheckoutAvailability({
          ...baseParams,
          isAcceptingOrders: false,
        })
      ).toEqual({
        allowed: false,
        reason: 'STUDIO_PAUSED',
      });
    });

    it('blocks checkout when studio account is inactive', () => {
      expect(
        evaluateStorefrontCheckoutAvailability({
          ...baseParams,
          studioStatus: 'suspended',
        })
      ).toEqual({
        allowed: false,
        reason: 'STUDIO_INACTIVE',
      });
    });
  });
});
