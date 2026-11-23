import { describe, expect, it } from 'vitest';
import {
  canActivateShop,
  canTransitionShopStatus,
  isAutoPrintEligible,
  resolveCustomerPaymentMethods,
  validateSlugSanity,
} from './shop-lifecycle.js';

describe('Shop Lifecycle & Capability Domain Rules (@snapprint/domain)', () => {
  describe('validateSlugSanity', () => {
    it('accepts clean, formatted lowercase slugs', () => {
      expect(validateSlugSanity('sri-krishna-prints').valid).toBe(true);
      expect(validateSlugSanity('xerox-point-101').valid).toBe(true);
      expect(validateSlugSanity('abc').valid).toBe(true);
    });

    it('rejects slugs that are too short or too long', () => {
      expect(validateSlugSanity('ab').valid).toBe(false);
      expect(validateSlugSanity('a'.repeat(49)).valid).toBe(false);
    });

    it('rejects invalid characters, uppercase, and consecutive hyphens', () => {
      expect(validateSlugSanity('Sri-Krishna').valid).toBe(false);
      expect(validateSlugSanity('sri krishna').valid).toBe(false);
      expect(validateSlugSanity('sri--krishna').valid).toBe(false);
      expect(validateSlugSanity('-sri-krishna').valid).toBe(false);
      expect(validateSlugSanity('sri-krishna-').valid).toBe(false);
    });

    it('rejects reserved system keywords', () => {
      const adminCheck = validateSlugSanity('admin');
      expect(adminCheck.valid).toBe(false);
      expect(adminCheck.reason).toContain('reserved system keyword');

      expect(validateSlugSanity('police').valid).toBe(false);
      expect(validateSlugSanity('api').valid).toBe(false);
      expect(validateSlugSanity('snapprint').valid).toBe(false);
    });
  });

  describe('isAutoPrintEligible', () => {
    const defaultCaps = { isAutoPrintEnabled: true, autoPrintMaxPages: 30 };

    it('returns true when totalSheets is within the autoPrintMaxPages threshold', () => {
      expect(isAutoPrintEligible(1, defaultCaps)).toBe(true);
      expect(isAutoPrintEligible(15, defaultCaps)).toBe(true);
      expect(isAutoPrintEligible(30, defaultCaps)).toBe(true);
    });

    it('returns false when totalSheets exceeds the threshold', () => {
      expect(isAutoPrintEligible(31, defaultCaps)).toBe(false);
      expect(isAutoPrintEligible(100, defaultCaps)).toBe(false);
    });

    it('returns false when auto-print is disabled or sheets <= 0', () => {
      expect(isAutoPrintEligible(5, { isAutoPrintEnabled: false, autoPrintMaxPages: 30 })).toBe(
        false
      );
      expect(isAutoPrintEligible(0, defaultCaps)).toBe(false);
      expect(isAutoPrintEligible(-5, defaultCaps)).toBe(false);
      expect(isAutoPrintEligible(10, undefined)).toBe(false);
    });
  });

  describe('canTransitionShopStatus', () => {
    it('allows valid state machine forward and operational transitions', () => {
      expect(canTransitionShopStatus('onboarding', 'active')).toBe(true);
      expect(canTransitionShopStatus('onboarding', 'pending_review')).toBe(true);
      expect(canTransitionShopStatus('pending_review', 'active')).toBe(true);
      expect(canTransitionShopStatus('active', 'suspended')).toBe(true);
      expect(canTransitionShopStatus('suspended', 'active')).toBe(true);
      expect(canTransitionShopStatus('active', 'closed')).toBe(true);
    });

    it('disallows invalid transitions or reviving closed shops', () => {
      expect(canTransitionShopStatus('closed', 'active')).toBe(false);
      expect(canTransitionShopStatus('closed', 'onboarding')).toBe(false);
    });
  });

  describe('canActivateShop', () => {
    it('validates minimum requirements for shop activation', () => {
      const validShop = {
        name: 'Ramesh Xerox',
        slug: 'ramesh-xerox',
        city: 'Hyderabad',
      };
      const result = canActivateShop(validShop);
      expect(result.canActivate).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing requirements and reports descriptive errors', () => {
      const invalidShop = {
        name: '',
        slug: 'admin',
        city: '',
      };
      const result = canActivateShop(invalidShop);
      expect(result.canActivate).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('resolveCustomerPaymentMethods', () => {
    it('returns only counter_cash when Razorpay is unconfirmed', () => {
      const methods = resolveCustomerPaymentMethods({
        enableCounterPayment: true,
        enableOnlinePayment: true,
        isRazorpayConfirmed: false,
      });
      expect(methods).toEqual(['counter_cash']);
    });

    it('returns both counter_cash and razorpay when Razorpay is confirmed', () => {
      const methods = resolveCustomerPaymentMethods({
        enableCounterPayment: true,
        enableOnlinePayment: true,
        isRazorpayConfirmed: true,
      });
      expect(methods).toEqual(['counter_cash', 'razorpay']);
    });

    it('falls back safely to counter_cash if all methods are disabled', () => {
      const methods = resolveCustomerPaymentMethods({
        enableCounterPayment: false,
        enableOnlinePayment: false,
        isRazorpayConfirmed: false,
      });
      expect(methods).toEqual(['counter_cash']);
    });
  });
});
