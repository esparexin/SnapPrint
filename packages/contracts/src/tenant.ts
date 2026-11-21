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
});

export type StudioSettings = z.infer<typeof StudioSettingsSchema>;

export const StudioSchema = z.object({
  id: StudioIdSchema,
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Studio slug must consist of lowercase alphanumeric characters and dashes',
    }),
  name: z.string().min(1).max(120),
  status: StudioStatusSchema,
  settings: StudioSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Studio = z.infer<typeof StudioSchema>;
