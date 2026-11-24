import { describe, expect, it } from 'vitest';
import { provisionPlatformAdmin } from './cli/provision-platform-admin.js';
import { createMockDb } from './mock-db.js';

describe('Provision Platform Admin CLI', () => {
  it('creates and provisions a platform_admin account in database', async () => {
    const mock = createMockDb();
    const result = await provisionPlatformAdmin({
      email: 'newadmin@snapprint.io',
      name: 'New Platform Admin',
      customDb: mock.db as unknown as import('mongodb').Db,
    });

    expect(result.userId).toBeDefined();
    expect(result.role).toBe('platform_admin');

    const user = mock.users.find((u) => u.email === 'newadmin@snapprint.io');
    expect(user).toBeDefined();
    expect(user?.status).toBe('active');

    const membership = mock.memberships.find((m) => m.userId === result.userId);
    expect(membership).toBeDefined();
    expect(membership?.role).toBe('platform_admin');
    expect(membership?.status).toBe('active');
  });

  it('promotes an existing studio_owner to platform_admin idempotently', async () => {
    const mock = createMockDb();
    mock.users.push({
      id: 'existing_owner',
      email: 'existing@studio.com',
      name: 'Existing Owner',
      status: 'active',
      passwordHash: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await provisionPlatformAdmin({
      email: 'existing@studio.com',
      customDb: mock.db as unknown as import('mongodb').Db,
    });

    expect(result.userId).toBe('existing_owner');
    expect(result.role).toBe('platform_admin');

    const membership = mock.memberships.find((m) => m.userId === 'existing_owner');
    expect(membership?.role).toBe('platform_admin');
  });
});
