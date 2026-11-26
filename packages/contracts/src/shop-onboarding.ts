import { z } from 'zod';
import {
  ShopPaymentSettings,
  ShopPaymentSettingsSchema,
  StudioNameSchema,
  StudioSlugSchema,
  StudioStatusSchema,
} from './tenant.js';
export { ShopPaymentSettingsSchema, type ShopPaymentSettings };
import { PaperSizeSchema } from './document-print.js';

export const ReservedSlugs = [
  'admin',
  'administrator',
  'api',
  'app',
  'assets',
  'auth',
  'billing',
  'cart',
  'checkout',
  'config',
  'dashboard',
  'doc',
  'docs',
  'download',
  'gov',
  'government',
  'health',
  'help',
  'home',
  'login',
  'logout',
  'null',
  'offline',
  'online',
  'operator',
  'order',
  'orders',
  'pay',
  'payment',
  'payments',
  'platform',
  'police',
  'print',
  'privacy',
  'public',
  'qr',
  'ready',
  'register',
  'root',
  's',
  'settings',
  'signin',
  'signout',
  'signup',
  'snapprint',
  'staff',
  'status',
  'studio',
  'studios',
  'support',
  'terms',
  'test',
  'undefined',
  'user',
  'users',
  'webhook',
  'webhooks',
  'xerox',
] as const;

export const ReservedSlugSchema = z.enum(ReservedSlugs);
export type ReservedSlug = z.infer<typeof ReservedSlugSchema>;

export const ShopWorkingHoursSchema = z.object({
  openTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Open time must be in HH:MM 24-hour format (e.g. 09:00)',
    })
    .default('09:00'),
  closeTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'Close time must be in HH:MM 24-hour format (e.g. 21:00)',
    })
    .default('21:00'),
  closedDays: z
    .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .default(['sunday']),
});
export type ShopWorkingHours = z.infer<typeof ShopWorkingHoursSchema>;

export const ShopLocationSchema = z.object({
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100).default('Telangana'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, { message: 'Pincode must be exactly 6 digits' })
    .optional(),
  addressLine: z.string().trim().max(250).optional(),
});
export type ShopLocation = z.infer<typeof ShopLocationSchema>;

export const ShopCapabilitiesConfigSchema = z.object({
  autoPrintMaxPages: z.number().int().min(1).max(500).default(30),
  isAutoPrintEnabled: z.boolean().default(true),
  supportsColor: z.boolean().default(true),
  supportsBlackAndWhite: z.boolean().default(true),
  supportedPaperSizes: z.array(PaperSizeSchema).min(1).default(['A4']),
});
export type ShopCapabilitiesConfig = z.infer<typeof ShopCapabilitiesConfigSchema>;

export const CreateShopRequestSchema = z.object({
  name: StudioNameSchema,
  slug: StudioSlugSchema,
  tagline: z.string().trim().max(160).optional(),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, {
      message: 'Contact phone must be a valid 10-digit Indian mobile number',
    })
    .optional(),
  contactEmail: z.string().email().optional(),
  location: ShopLocationSchema,
  workingHours: ShopWorkingHoursSchema.optional().default({
    openTime: '09:00',
    closeTime: '21:00',
    closedDays: ['sunday'],
  }),
  capabilities: ShopCapabilitiesConfigSchema.optional().default({
    autoPrintMaxPages: 30,
    isAutoPrintEnabled: true,
    supportsColor: true,
    supportsBlackAndWhite: true,
    supportedPaperSizes: ['A4'],
  }),
  payment: ShopPaymentSettingsSchema.optional().default({
    enableCounterPayment: true,
    enableOnlinePayment: false,
    isRazorpayConfirmed: false,
  }),
});
export type CreateShopRequest = z.infer<typeof CreateShopRequestSchema>;
export type CreateShopInput = z.input<typeof CreateShopRequestSchema>;

export const UpdateShopProfileRequestSchema = CreateShopRequestSchema.partial();
export type UpdateShopProfileRequest = z.infer<typeof UpdateShopProfileRequestSchema>;
export type UpdateShopProfileInput = z.input<typeof UpdateShopProfileRequestSchema>;

export const ShopActivationRequestSchema = z.object({
  confirmReady: z.boolean().refine((val) => val === true, {
    message: 'You must confirm operational readiness to activate the shop',
  }),
});
export type ShopActivationRequest = z.infer<typeof ShopActivationRequestSchema>;

export const ShopActivationResponseSchema = z.object({
  studioId: z.string(),
  status: StudioStatusSchema,
  activatedAt: z.string().datetime(),
  publicUrl: z.string().url(),
});
export type ShopActivationResponse = z.infer<typeof ShopActivationResponseSchema>;
