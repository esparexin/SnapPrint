import { z } from 'zod';
import {
  StudioIdSchema,
  StudioNameSchema,
  StudioSlugSchema,
  StudioStatusSchema,
} from './tenant.js';

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
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  isAcceptingOrders: z.boolean().optional(),
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
