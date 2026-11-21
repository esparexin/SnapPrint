import { describe, expect, it } from 'vitest';
import {
  assertTenantOwnership,
  buildTenantScopedStorageKey,
  canAccessStudio,
  TenantIsolationViolationError,
} from './tenancy.js';

describe('Tenancy Isolation Logic', () => {
  it('assertTenantOwnership passes when studio IDs match', () => {
    expect(() => assertTenantOwnership('studio_1', 'studio_1')).not.toThrow();
  });

  it('assertTenantOwnership throws TenantIsolationViolationError on mismatch', () => {
    expect(() => assertTenantOwnership('studio_1', 'studio_2')).toThrow(
      TenantIsolationViolationError
    );
  });

  it('allows platform_admin to access any studio', () => {
    expect(canAccessStudio('platform_admin', null, 'studio_any')).toBe(true);
  });

  it('allows studio_owner to access only their own studio', () => {
    expect(canAccessStudio('studio_owner', 'studio_mine', 'studio_mine')).toBe(true);
    expect(canAccessStudio('studio_owner', 'studio_mine', 'studio_other')).toBe(false);
  });

  it('buildTenantScopedStorageKey constructs isolated paths and strips traversal characters', () => {
    const key = buildTenantScopedStorageKey('std_1', 'sessions', 'sess_abc', '../../photo.jpg');
    expect(key).toBe('studios/std_1/sessions/sess_abc/photo.jpg');
    expect(key.startsWith('studios/std_1/sessions/sess_abc/')).toBe(true);
  });
});
