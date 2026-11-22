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
  'record_payments',
]);

export type Permission = z.infer<typeof PermissionSchema>;

export const UserStatusSchema = z.enum(['active', 'suspended', 'invited']);

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address' })
  .max(255);

export const UserIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9_-]+$/, {
    message:
      'UserId must consist only of lowercase alphanumeric characters, dashes, or underscores',
  });

export type UserId = z.infer<typeof UserIdSchema>;

export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  name: z.string().trim().min(1).max(120),
  phone: z.string().optional(),
  status: UserStatusSchema,
  termsAcceptedVersion: z.string().optional(),
  termsAcceptedAt: z.string().datetime().optional(),
  privacyPolicyAcceptedVersion: z.string().optional(),
  privacyPolicyAcceptedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const UserWithPasswordHashSchema = UserSchema.extend({
  passwordHash: z.string().min(1).nullable().optional(),
});

export type UserWithPasswordHash = z.infer<typeof UserWithPasswordHashSchema>;

export const UserMembershipSchema = z.object({
  userId: UserIdSchema,
  studioId: StudioIdSchema.nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime(),
});

export type UserMembership = z.infer<typeof UserMembershipSchema>;

export const OperatorSessionStatusSchema = z.enum(['active', 'revoked']);

export type OperatorSessionStatus = z.infer<typeof OperatorSessionStatusSchema>;

export const OperatorSessionSchema = z.object({
  sessionId: z.string().min(16).max(128),
  userId: UserIdSchema,
  status: OperatorSessionStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
});

export type OperatorSession = z.infer<typeof OperatorSessionSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }).max(128),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  memberships: z.array(UserMembershipSchema),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
