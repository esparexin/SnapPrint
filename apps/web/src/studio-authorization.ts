import { AuthResponse, Permission, UserMembership, UserRole } from '@snapprint/contracts';
import { canAccessStudio, hasPermission, ROLE_PERMISSIONS } from '@snapprint/domain';

export type AuthorizationUiState =
  | 'loading'
  | 'unauthenticated'
  | 'no_memberships'
  | 'ready'
  | 'access_denied';

export const isActivePlatformAdmin = (user: AuthResponse | null): boolean =>
  Boolean(user?.memberships.some((m) => m.role === 'platform_admin' && m.status === 'active'));

export interface StudioAuthorizationState {
  uiState: AuthorizationUiState;
  activeMemberships: UserMembership[];
  selectedStudioId: string | null;
  currentMembership: UserMembership | null;
  effectiveRole: UserRole | null;
  effectivePermissions: readonly Permission[];
  can: (permission: Permission) => boolean;
  canAccessTargetStudio: (targetStudioId: string) => boolean;
}

export function resolveStudioAuthorization(
  auth: AuthResponse | null,
  selectedStudioId?: string | null
): StudioAuthorizationState {
  if (!auth) {
    return {
      uiState: 'unauthenticated',
      activeMemberships: [],
      selectedStudioId: null,
      currentMembership: null,
      effectiveRole: null,
      effectivePermissions: [],
      can: () => false,
      canAccessTargetStudio: () => false,
    };
  }

  const activeMemberships = auth.memberships.filter(
    (m) => m.status === 'active' && Boolean(m.studioId || m.role === 'platform_admin')
  );

  if (activeMemberships.length === 0) {
    return {
      uiState: 'no_memberships',
      activeMemberships: [],
      selectedStudioId: null,
      currentMembership: null,
      effectiveRole: null,
      effectivePermissions: [],
      can: () => false,
      canAccessTargetStudio: () => false,
    };
  }

  // Find effective membership for chosen studio or default to first active studio
  const targetId =
    selectedStudioId ||
    activeMemberships.find((m) => m.studioId)?.studioId ||
    (activeMemberships[0].role === 'platform_admin' ? 'platform_scope' : null);

  const directMembership = activeMemberships.find((m) => m.studioId === targetId);
  const platformAdmin = activeMemberships.find((m) => m.role === 'platform_admin');
  const currentMembership = directMembership || platformAdmin || null;

  if (!currentMembership) {
    return {
      uiState: 'access_denied',
      activeMemberships,
      selectedStudioId: targetId,
      currentMembership: null,
      effectiveRole: null,
      effectivePermissions: [],
      can: () => false,
      canAccessTargetStudio: () => false,
    };
  }

  const effectiveRole = currentMembership.role;
  const effectivePermissions = ROLE_PERMISSIONS[effectiveRole];

  return {
    uiState: 'ready',
    activeMemberships,
    selectedStudioId: targetId,
    currentMembership,
    effectiveRole,
    effectivePermissions,
    can: (permission: Permission) => hasPermission(effectiveRole, permission),
    canAccessTargetStudio: (studioId: string) =>
      canAccessStudio(effectiveRole, currentMembership.studioId, studioId),
  };
}
