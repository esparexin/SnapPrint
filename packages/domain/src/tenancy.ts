import type { UserRole } from '@snapprint/contracts';

export class TenantIsolationViolationError extends Error {
  constructor(message = 'Tenant isolation violation: cross-tenant access denied') {
    super(message);
    this.name = 'TenantIsolationViolationError';
  }
}

/**
 * Asserts that a resource belongs to the expected studio.
 * Throws a TenantIsolationViolationError on mismatch.
 */
export function assertTenantOwnership(expectedStudioId: string, resourceStudioId: string): void {
  if (expectedStudioId !== resourceStudioId) {
    throw new TenantIsolationViolationError(
      `Resource tenant mismatch: expected studio '${expectedStudioId}', found '${resourceStudioId}'`
    );
  }
}

/**
 * Checks whether a caller with a given role and studio affiliation can access target studio resources.
 */
export function canAccessStudio(
  callerRole: UserRole,
  callerStudioId: string | null,
  targetStudioId: string
): boolean {
  if (callerRole === 'platform_admin') {
    return true;
  }
  return callerStudioId !== null && callerStudioId === targetStudioId;
}

/**
 * Generates an isolated, structured private object storage key scoped strictly to a studio.
 */
export function buildTenantScopedStorageKey(
  studioId: string,
  scope: 'sessions' | 'orders' | 'prints',
  entityId: string,
  filename: string
): string {
  // Take only the file basename and strip path traversal / illegal characters
  const basename = filename.split(/[/\\]/).pop() || 'asset';
  const sanitizedFilename =
    basename.replace(/^\.+/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset';
  return `studios/${studioId}/${scope}/${entityId}/${sanitizedFilename}`;
}
