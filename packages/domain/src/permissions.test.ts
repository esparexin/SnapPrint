import { describe, expect, it } from 'vitest';
import { canPerformAction, hasPermission } from './permissions.js';

describe('Role & Permission Authorization', () => {
  it('correctly maps studio_owner permissions', () => {
    expect(hasPermission('studio_owner', 'manage_studio')).toBe(true);
    expect(hasPermission('studio_owner', 'manage_catalog')).toBe(true);
    expect(hasPermission('studio_owner', 'manage_printers')).toBe(true);
    expect(hasPermission('studio_owner', 'manage_platform')).toBe(false);
  });

  it('correctly maps studio_staff permissions to operational scope only', () => {
    expect(hasPermission('studio_staff', 'view_orders')).toBe(true);
    expect(hasPermission('studio_staff', 'manage_order_status')).toBe(true);
    expect(hasPermission('studio_staff', 'download_assets')).toBe(true);
    expect(hasPermission('studio_staff', 'manage_catalog')).toBe(false);
    expect(hasPermission('studio_staff', 'manage_printers')).toBe(false);
  });

  it('verifies canPerformAction enforces tenant isolation and active status', () => {
    const owner = {
      userId: 'usr_1',
      studioId: 'std_alpha',
      role: 'studio_owner' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    expect(canPerformAction(owner, 'manage_catalog', 'std_alpha')).toBe(true);
    // Denied on different studio
    expect(canPerformAction(owner, 'manage_catalog', 'std_beta')).toBe(false);

    // Suspended user denied
    const suspendedOwner = { ...owner, status: 'suspended' as const };
    expect(canPerformAction(suspendedOwner, 'manage_catalog', 'std_alpha')).toBe(false);
  });
});
