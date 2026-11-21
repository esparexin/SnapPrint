import { z } from 'zod';
import { StudioIdSchema } from './tenant.js';

export const UserRoleSchema = z.enum(['platform_admin', 'studio_owner', 'studio_staff']);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const PermissionSchema = z.enum([
  'manage_platform',
  'manage_studio',
  'manage_catalog',
  'manage_printers',
  'view_orders',
  'manage_order_status',
  'download_assets',
]);

export type Permission = z.infer<typeof PermissionSchema>;

export const UserStatusSchema = z.enum(['active', 'suspended', 'invited']);

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserMembershipSchema = z.object({
  userId: z.string().min(1).max(64),
  studioId: StudioIdSchema.nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime(),
});

export type UserMembership = z.infer<typeof UserMembershipSchema>;
