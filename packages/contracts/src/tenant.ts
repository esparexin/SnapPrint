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

export const StudioStatusSchema = z.enum(['onboarding', 'active', 'suspended', 'closed']);

export type StudioStatus = z.infer<typeof StudioStatusSchema>;

export const StudioSettingsSchema = z.object({
  currency: z.string().length(3).default('INR'),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
  maxActivePrinters: z.number().int().min(1).max(2).default(2),
  autoApproveOrders: z.boolean().default(false),
  paymentPolicy: z
    .enum(['payment_required', 'pay_at_counter'])
    .default('payment_required')
    .optional(),
  onlinePaymentEnabled: z.boolean().default(true).optional(),
  counterPaymentEnabled: z.boolean().default(true).optional(),
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

export const StudioSchema = z.object({
  id: StudioIdSchema,
  slug: StudioSlugSchema,
  name: StudioNameSchema,
  status: StudioStatusSchema,
  settings: StudioSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Studio = z.infer<typeof StudioSchema>;

export const PublicStudioSchema = z.object({
  id: StudioIdSchema,
  slug: StudioSlugSchema,
  name: StudioNameSchema,
  status: StudioStatusSchema,
  currency: z.string().length(3).default('INR'),
  contactPhone: z.string().min(5).max(20).optional(),
  contactEmail: z.string().email().optional(),
});

export type PublicStudio = z.infer<typeof PublicStudioSchema>;
