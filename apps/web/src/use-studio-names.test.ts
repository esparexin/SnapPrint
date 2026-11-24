import { describe, expect, it } from 'vitest';
import { UserMembership } from '@snapprint/contracts';
import { extractTargetStudioIds } from '../app/components/use-studio-names.js';
import { formatStudioOptionLabel } from '../app/components/studio-selector.js';

describe('Studio Names & Context Formatting', () => {
  it('extractTargetStudioIds returns empty array when no memberships provided', () => {
    expect(extractTargetStudioIds()).toEqual([]);
    expect(extractTargetStudioIds([])).toEqual([]);
  });

  it('filters out platform_scope and deduplicates studio IDs', () => {
    const memberships: UserMembership[] = [
      {
        userId: 'u1',
        studioId: 'platform_scope',
        role: 'platform_admin',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
      {
        userId: 'u1',
        studioId: 'studio_abc',
        role: 'studio_owner',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
      {
        userId: 'u1',
        studioId: 'studio_abc',
        role: 'studio_staff',
        status: 'active',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ];

    expect(extractTargetStudioIds(memberships)).toEqual(['studio_abc']);
  });

  it('formatStudioOptionLabel formats studio names accurately', () => {
    expect(formatStudioOptionLabel({ studioId: 'platform_scope' })).toBe('Platform Administration');
    expect(formatStudioOptionLabel({})).toBe('Platform Administration');
    expect(formatStudioOptionLabel({ studioId: 'studio_123' }, {})).toBe('Studio: studio_123');
    expect(
      formatStudioOptionLabel({ studioId: 'studio_123' }, { studio_123: 'Vikram Mobiles' })
    ).toBe('Vikram Mobiles (studio_123)');
  });

  it('guarantees useStudioNames is invoked before early returns in OperatorPortal', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const portalFile = path.resolve(process.cwd(), 'apps/web/app/components/operator-portal.tsx');
    const content = fs.readFileSync(portalFile, 'utf8');

    const hookIndex = content.indexOf('const studioNames = useStudioNames(');
    const loadingEarlyReturn = content.indexOf('if (loading) {');
    const authEarlyReturn = content.indexOf('if (!auth) {');

    expect(hookIndex).toBeGreaterThan(0);
    expect(loadingEarlyReturn).toBeGreaterThan(0);
    expect(authEarlyReturn).toBeGreaterThan(0);

    // React rules of hooks: hooks must be invoked at top-level before early returns
    expect(hookIndex).toBeLessThan(loadingEarlyReturn);
    expect(hookIndex).toBeLessThan(authEarlyReturn);
  });
});
