import { z } from 'zod';
import {
  StudioIdSchema,
  StudioNameSchema,
  StudioSlugSchema,
  StudioStatusSchema,
} from './tenant.js';
import { ShopLocationSchema, ShopPaymentSettingsSchema } from './shop-onboarding.js';
import { SubscriptionPlanIdSchema, SubscriptionStatusSchema } from './subscription.js';

export const PlatformMetricsResponseSchema = z.object({
  totalStudios: z.number().int().nonnegative(),
  activeStudios: z.number().int().nonnegative(),
  onboardingStudios: z.number().int().nonnegative(),
  suspendedStudios: z.number().int().nonnegative(),
  totalOrdersCount: z.number().int().nonnegative(),
  totalPaidVolumeMinor: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default('INR'),
});

export type PlatformMetricsResponse = z.infer<typeof PlatformMetricsResponseSchema>;

export const PlatformStudioItemSchema = z.object({
  id: StudioIdSchema,
  slug: StudioSlugSchema,
  name: StudioNameSchema,
  status: StudioStatusSchema,
  ownerUserId: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  isAcceptingOrders: z.boolean().optional(),
  printerCount: z.number().int().nonnegative().optional(),
  payment: ShopPaymentSettingsSchema.optional(),
  subscription: z
    .object({
      plan: SubscriptionPlanIdSchema,
      status: SubscriptionStatusSchema,
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PlatformStudioItem = z.infer<typeof PlatformStudioItemSchema>;

export const ListPlatformStudiosQuerySchema = z.object({
  status: StudioStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  skip: z.coerce.number().int().nonnegative().default(0).optional(),
});

export type ListPlatformStudiosQuery = z.infer<typeof ListPlatformStudiosQuerySchema>;

export const ListPlatformStudiosResponseSchema = z.object({
  studios: z.array(PlatformStudioItemSchema),
  total: z.number().int().nonnegative(),
});

export type ListPlatformStudiosResponse = z.infer<typeof ListPlatformStudiosResponseSchema>;

export const UpdatePlatformStudioStatusRequestSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending_review', 'closed']),
  reason: z.string().trim().min(3).max(500).optional(),
});

export type UpdatePlatformStudioStatusRequest = z.infer<
  typeof UpdatePlatformStudioStatusRequestSchema
>;

export const PlatformAuditEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().datetime(),
  actorId: z.string().min(1),
  action: z.string().min(1).max(100),
  targetType: z.string().min(1).max(50),
  targetId: z.string().min(1).max(100),
  reason: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PlatformAuditEntry = z.infer<typeof PlatformAuditEntrySchema>;

export const ListPlatformAuditLogsResponseSchema = z.object({
  auditLogs: z.array(PlatformAuditEntrySchema),
  total: z.number().int().nonnegative(),
});

export type ListPlatformAuditLogsResponse = z.infer<typeof ListPlatformAuditLogsResponseSchema>;

export const PlatformUserItemSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  status: z.enum(['active', 'suspended', 'pending_verification']),
  role: z.enum(['platform_admin', 'studio_owner', 'studio_staff']),
  studioId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type PlatformUserItem = z.infer<typeof PlatformUserItemSchema>;

export const ListPlatformUsersResponseSchema = z.object({
  users: z.array(PlatformUserItemSchema),
  total: z.number().int().nonnegative(),
});

export type ListPlatformUsersResponse = z.infer<typeof ListPlatformUsersResponseSchema>;

export const CreatePlatformAdminUserRequestSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().optional(),
});
export type CreatePlatformAdminUserRequest = z.infer<typeof CreatePlatformAdminUserRequestSchema>;

export const UpdatePlatformUserStatusRequestSchema = z.object({
  status: z.enum(['active', 'suspended']),
});
export type UpdatePlatformUserStatusRequest = z.infer<typeof UpdatePlatformUserStatusRequestSchema>;

export const AdminOverrideSubscriptionRequestSchema = z.object({
  plan: SubscriptionPlanIdSchema,
  durationDays: z.coerce.number().int().positive().max(3650).optional(),
  reason: z.string().trim().min(3).max(500),
});
export type AdminOverrideSubscriptionRequest = z.infer<
  typeof AdminOverrideSubscriptionRequestSchema
>;

export const AdminOverrideSubscriptionResponseSchema = z.object({
  success: z.boolean(),
  subscription: z.object({
    plan: SubscriptionPlanIdSchema,
    status: SubscriptionStatusSchema,
    startsAt: z.string(),
    expiresAt: z.string(),
    updatedAt: z.string(),
  }),
});
export type AdminOverrideSubscriptionResponse = z.infer<
  typeof AdminOverrideSubscriptionResponseSchema
>;

export const PlatformStudioDetailsResponseSchema = z.object({
  studio: PlatformStudioItemSchema.extend({
    tagline: z.string().optional(),
    location: ShopLocationSchema.optional(),
    currency: z.string().default('INR'),
    maxActivePrinters: z.number().int().optional(),
    autoApproveOrders: z.boolean().default(false),
    payment: ShopPaymentSettingsSchema.optional(),
  }),
  owner: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      status: z.string(),
      createdAt: z.string(),
    })
    .nullable(),
  printers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      driverName: z.string(),
      role: z.string(),
      isColorSupported: z.boolean(),
      supportedPaperSizes: z.array(z.string()),
      status: z.string(),
      isDefaultOsPrinter: z.boolean(),
      lastSeenAt: z.string(),
    })
  ),
  devices: z.array(
    z.object({
      deviceId: z.string(),
      hostname: z.string(),
      osPlatform: z.string(),
      agentVersion: z.string(),
      status: z.string(),
      lastHeartbeatAt: z.string(),
      createdAt: z.string(),
    })
  ),
  subscription: z
    .object({
      plan: SubscriptionPlanIdSchema,
      status: SubscriptionStatusSchema,
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
    })
    .nullable()
    .optional(),
  printStats: z
    .object({
      totalCompletedPrints: z.number().int().nonnegative(),
      colorPrints: z.number().int().nonnegative(),
      bwPrints: z.number().int().nonnegative(),
    })
    .optional(),
});
export type PlatformStudioDetailsResponse = z.infer<typeof PlatformStudioDetailsResponseSchema>;
