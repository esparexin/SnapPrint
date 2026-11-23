import type { Permission, UserMembership, UserRole } from '@snapprint/contracts';
import { canAccessStudio } from './tenancy.js';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  platform_admin: [
    'manage_platform',
    'manage_studio',
    'manage_catalog',
    'manage_printers',
    'view_orders',
    'manage_order_status',
    'download_assets',
    'record_payments',
    'manage_staff',
    'view_analytics',
  ],
  studio_owner: [
    'manage_studio',
    'manage_catalog',
    'manage_printers',
    'view_orders',
    'manage_order_status',
    'download_assets',
    'record_payments',
    'manage_staff',
    'view_analytics',
  ],
  studio_staff: [
    'view_orders',
    'manage_order_status',
    'download_assets',
    'record_payments',
    'view_analytics',
  ],
} as const;

/**
 * Checks whether a given role holds the requested permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Verifies both permission authorization and studio-level scoping.
 */
export function canPerformAction(
  membership: UserMembership,
  permission: Permission,
  targetStudioId?: string
): boolean {
  if (membership.status !== 'active') {
    return false;
  }

  if (!hasPermission(membership.role, permission)) {
    return false;
  }

  if (targetStudioId && !canAccessStudio(membership.role, membership.studioId, targetStudioId)) {
    return false;
  }

  return true;
}
