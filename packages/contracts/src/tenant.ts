import { z } from 'zod';

export const StudioIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_-]+$/, {
    message:
      'StudioId must consist only of lowercase alphanumeric characters, dashes, or underscores',
  });

export type StudioId = z.infer<typeof StudioIdSchema>;

export const StudioStatusSchema = z.enum([
  'onboarding',
  'pending_review',
  'active',
  'suspended',
  'closed',
]);

export type StudioStatus = z.infer<typeof StudioStatusSchema>;

export const SheetPricingRateSchema = z.object({
  singleSidedMinor: z.number().int().nonnegative(),
  doubleSidedMinor: z.number().int().nonnegative(),
});
export type SheetPricingRateContract = z.infer<typeof SheetPricingRateSchema>;

export const StudioPrintRatesSchema = z.record(
  z.string(),
  z.record(z.string(), SheetPricingRateSchema)
);
export type StudioPrintRatesContract = z.infer<typeof StudioPrintRatesSchema>;

export const StudioSettingsSchema = z.object({
  currency: z.string().length(3).default('INR'),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  maxActivePrinters: z.number().int().min(1).default(2),
  autoApproveOrders: z.boolean().default(false),
  paymentPolicy: z
    .enum(['payment_required', 'pay_at_counter'])
    .default('payment_required')
    .optional(),
  onlinePaymentEnabled: z.boolean().default(true).optional(),
  counterPaymentEnabled: z.boolean().default(true).optional(),
  isAcceptingOrders: z.boolean().default(true).optional(),
  printRates: StudioPrintRatesSchema.optional(),
});

export type StudioSettings = z.infer<typeof StudioSettingsSchema>;

export const StudioSlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9-]+$/, {
    message: 'Studio slug must consist of lowercase alphanumeric characters and dashes',
  });

export type StudioSlug = z.infer<typeof StudioSlugSchema>;

export const StudioNameSchema = z.string().trim().min(1).max(120);

export type StudioName = z.infer<typeof StudioNameSchema>;

export const PublicPaymentSettingsSchema = z.object({
  enableCounterPayment: z.boolean().default(true),
  enableOnlinePayment: z.boolean().default(false),
  isRazorpayConfirmed: z.boolean().default(false),
});

export type PublicPaymentSettings = z.infer<typeof PublicPaymentSettingsSchema>;

export const ShopPaymentSettingsSchema = PublicPaymentSettingsSchema.extend({
  razorpayKeyId: z.string().trim().min(1).optional(),
});

export type ShopPaymentSettings = z.infer<typeof ShopPaymentSettingsSchema>;

export const StudioSchema = z.object({
  id: StudioIdSchema,
  slug: StudioSlugSchema,
  name: StudioNameSchema,
  status: StudioStatusSchema,
  settings: StudioSettingsSchema,
  payment: ShopPaymentSettingsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Studio = z.infer<typeof StudioSchema>;

export const StudioPublicCapabilitiesSchema = z.object({
  supportsDuplex: z.boolean().default(false),
  supportedDuplexSizes: z.array(z.string()).default([]),
  supportsColor: z.boolean().default(false),
  supportedPaperSizes: z.array(z.string()).default(['A4']),
});
export type StudioPublicCapabilities = z.infer<typeof StudioPublicCapabilitiesSchema>;

export const PublicStudioSchema = z.object({
  id: StudioIdSchema,
  slug: StudioSlugSchema,
  name: StudioNameSchema,
  status: StudioStatusSchema,
  currency: z.string().length(3).default('INR'),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  isAcceptingOrders: z.boolean().default(true).optional(),
  payment: PublicPaymentSettingsSchema.optional(),
  printRates: StudioPrintRatesSchema.optional(),
  capabilities: StudioPublicCapabilitiesSchema.optional(),
});

export type PublicStudio = z.infer<typeof PublicStudioSchema>;
