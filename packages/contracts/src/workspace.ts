import { z } from 'zod';
import { EmailSchema, UserIdSchema, UserRoleSchema } from './identity.js';
import { StudioIdSchema } from './tenant.js';

export const PrintVolumeMetricsSchema = z.object({
  bwPages: z.number().int().nonnegative(),
  colorPages: z.number().int().nonnegative(),
  totalSheets: z.number().int().nonnegative(),
});

export type PrintVolumeMetrics = z.infer<typeof PrintVolumeMetricsSchema>;

export const StudioMetricsResponseSchema = z.object({
  todayOrdersCount: z.number().int().nonnegative(),
  todayPaidCollectionsMinor: z.number().int().nonnegative(),
  pendingOrdersCount: z.number().int().nonnegative(),
  printVolume: PrintVolumeMetricsSchema,
  currency: z.string().default('INR'),
});

export type StudioMetricsResponse = z.infer<typeof StudioMetricsResponseSchema>;

export const StaffMemberStatusSchema = z.enum(['active', 'invited', 'revoked']);

export type StaffMemberStatus = z.infer<typeof StaffMemberStatusSchema>;

export const StaffMemberSchema = z.object({
  id: z.string().min(1),
  userId: UserIdSchema,
  studioId: StudioIdSchema,
  email: EmailSchema,
  name: z.string().trim().min(1).max(120).optional(),
  role: UserRoleSchema,
  status: StaffMemberStatusSchema,
  createdAt: z.string().datetime(),
  invitedByUserId: UserIdSchema.optional(),
});

export type StaffMember = z.infer<typeof StaffMemberSchema>;

export const StaffRosterResponseSchema = z.object({
  staff: z.array(StaffMemberSchema),
});

export type StaffRosterResponse = z.infer<typeof StaffRosterResponseSchema>;

export const InviteStaffRequestSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().min(1).max(120).optional(),
  role: z.literal('studio_staff').default('studio_staff'),
});

export type InviteStaffRequest = z.infer<typeof InviteStaffRequestSchema>;

export const InviteStaffResponseSchema = z.object({
  success: z.boolean(),
  staff: StaffMemberSchema,
});

export type InviteStaffResponse = z.infer<typeof InviteStaffResponseSchema>;

export const RevokeStaffResponseSchema = z.object({
  success: z.boolean(),
  membershipId: z.string(),
  status: z.literal('revoked'),
});

export type RevokeStaffResponse = z.infer<typeof RevokeStaffResponseSchema>;

export const UpdateStudioProfileRequestSchema = z.object({
  tagline: z.string().trim().max(160).optional(),
  contactPhone: z.string().trim().max(25).optional(),
  address: z.string().trim().max(250).optional(),
  isAcceptingOrders: z.boolean().optional(),
});

export type UpdateStudioProfileRequest = z.infer<typeof UpdateStudioProfileRequestSchema>;
