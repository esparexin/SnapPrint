import { describe, expect, it } from 'vitest';
import {
  CreateShopRequestSchema,
  ReservedSlugSchema,
  ShopCapabilitiesConfigSchema,
  ShopLocationSchema,
  ShopPaymentSettingsSchema,
  ShopWorkingHoursSchema,
  UpdateShopProfileRequestSchema,
} from './shop-onboarding.js';

describe('Shop Onboarding Schemas (@snapprint/contracts)', () => {
  describe('ShopWorkingHoursSchema', () => {
    it('applies default working hours correctly', () => {
      const parsed = ShopWorkingHoursSchema.parse({});
      expect(parsed.openTime).toBe('09:00');
      expect(parsed.closeTime).toBe('21:00');
      expect(parsed.closedDays).toEqual(['sunday']);
    });

    it('rejects invalid time formats', () => {
      expect(() => ShopWorkingHoursSchema.parse({ openTime: '9:00' })).toThrow();
      expect(() => ShopWorkingHoursSchema.parse({ closeTime: '25:00' })).toThrow();
      expect(() => ShopWorkingHoursSchema.parse({ openTime: 'invalid' })).toThrow();
    });
  });

  describe('ShopLocationSchema', () => {
    it('validates mandatory city and valid 6-digit pincode', () => {
      const valid = ShopLocationSchema.parse({
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500038',
      });
      expect(valid.city).toBe('Hyderabad');
      expect(valid.pincode).toBe('500038');
    });

    it('rejects invalid pincodes or empty city', () => {
      expect(() => ShopLocationSchema.parse({ city: '', pincode: '500038' })).toThrow();
      expect(() => ShopLocationSchema.parse({ city: 'Hyd', pincode: '12345' })).toThrow();
      expect(() => ShopLocationSchema.parse({ city: 'Hyd', pincode: 'abcdef' })).toThrow();
    });
  });

  describe('ShopCapabilitiesConfigSchema', () => {
    it('applies default autoPrintMaxPages of 30 and A4 paper size', () => {
      const parsed = ShopCapabilitiesConfigSchema.parse({});
      expect(parsed.autoPrintMaxPages).toBe(30);
      expect(parsed.isAutoPrintEnabled).toBe(true);
      expect(parsed.supportedPaperSizes).toEqual(['A4']);
    });

    it('enforces bounds for autoPrintMaxPages (1 to 500)', () => {
      expect(() => ShopCapabilitiesConfigSchema.parse({ autoPrintMaxPages: 0 })).toThrow();
      expect(() => ShopCapabilitiesConfigSchema.parse({ autoPrintMaxPages: 501 })).toThrow();
      const valid = ShopCapabilitiesConfigSchema.parse({ autoPrintMaxPages: 50 });
      expect(valid.autoPrintMaxPages).toBe(50);
    });
  });

  describe('ShopPaymentSettingsSchema', () => {
    it('defaults strictly to Cash Only with unconfirmed Razorpay', () => {
      const parsed = ShopPaymentSettingsSchema.parse({});
      expect(parsed.enableCounterPayment).toBe(true);
      expect(parsed.enableOnlinePayment).toBe(false);
      expect(parsed.isRazorpayConfirmed).toBe(false);
    });
  });

  describe('CreateShopRequestSchema', () => {
    it('successfully parses a complete valid shop creation payload', () => {
      const validPayload = {
        name: 'Sri Krishna Xerox & Prints',
        slug: 'sri-krishna-xerox',
        tagline: 'Fast and reliable student document printing',
        contactPhone: '9876543210',
        contactEmail: 'owner@example.com',
        location: {
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500038',
        },
        capabilities: {
          autoPrintMaxPages: 40,
        },
      };

      const parsed = CreateShopRequestSchema.parse(validPayload);
      expect(parsed.name).toBe('Sri Krishna Xerox & Prints');
      expect(parsed.slug).toBe('sri-krishna-xerox');
      expect(parsed.capabilities.autoPrintMaxPages).toBe(40);
      expect(parsed.payment.enableCounterPayment).toBe(true);
    });

    it('rejects invalid mobile numbers or invalid slugs', () => {
      expect(() =>
        CreateShopRequestSchema.parse({
          name: 'Shop',
          slug: 'INVALID SLUG!',
          location: { city: 'Hyd' },
        })
      ).toThrow();

      expect(() =>
        CreateShopRequestSchema.parse({
          name: 'Shop',
          slug: 'valid-slug',
          contactPhone: '12345',
          location: { city: 'Hyd' },
        })
      ).toThrow();
    });
  });

  describe('ReservedSlugSchema', () => {
    it('identifies reserved system keywords', () => {
      expect(ReservedSlugSchema.safeParse('admin').success).toBe(true);
      expect(ReservedSlugSchema.safeParse('api').success).toBe(true);
      expect(ReservedSlugSchema.safeParse('police').success).toBe(true);
      expect(ReservedSlugSchema.safeParse('sri-krishna').success).toBe(false);
    });
  });

  describe('UpdateShopProfileRequestSchema', () => {
    it('permits partial profile updates', () => {
      const parsed = UpdateShopProfileRequestSchema.parse({
        tagline: 'New updated tagline',
      });
      expect(parsed.tagline).toBe('New updated tagline');
    });
  });
});
