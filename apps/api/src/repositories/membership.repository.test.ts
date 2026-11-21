import { describe, expect, it } from 'vitest';
import { Db } from 'mongodb';
import {
  createUserMembership,
  findMembershipsByStudio,
  findUserMembershipForStudio,
  findUserMemberships,
  toMembershipContract,
  updateMembershipStatus,
  UserMembershipDocument,
} from './membership.repository.js';

function createMockDb() {
  const store: UserMembershipDocument[] = [];

  const collection = {
    async insertOne(doc: UserMembershipDocument) {
      store.push({ ...doc });
      return { acknowledged: true, insertedId: doc.userId };
    },
    find(filter: { userId?: string; status?: string; studioId?: string }) {
      const results = store.filter((m) => {
        if (filter.userId && m.userId !== filter.userId) return false;
        if (filter.status && m.status !== filter.status) return false;
        if (filter.studioId && m.studioId !== filter.studioId) return false;
        return true;
      });
      return {
        toArray: async () => results.map((r) => ({ ...r })),
      };
    },
    async findOne(filter: { userId: string; studioId: string | null }) {
      const item = store.find((m) => m.userId === filter.userId && m.studioId === filter.studioId);
      return item ? { ...item } : null;
    },
    async updateOne(
      filter: { userId: string; studioId: string | null },
      update: { $set: { status: string } }
    ) {
      const item = store.find((m) => m.userId === filter.userId && m.studioId === filter.studioId);
      if (!item) return { matchedCount: 0, modifiedCount: 0 };
      item.status = update.$set.status as typeof item.status;
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };

  const db = {
    collection: () => collection,
  } as unknown as Db;

  return { db, store };
}

describe('Membership Persistence Repository', () => {
  it('toMembershipContract converts native BSON Date to ISO string', () => {
    const doc: UserMembershipDocument = {
      userId: 'user_01h8abc1234567890123456789',
      studioId: 'studio_alpha',
      role: 'studio_owner',
      status: 'active',
      createdAt: new Date('2026-11-21T12:00:00.000Z'),
    };

    const contract = toMembershipContract(doc);
    expect(contract.userId).toBe(doc.userId);
    expect(contract.studioId).toBe(doc.studioId);
    expect(contract.role).toBe('studio_owner');
    expect(contract.status).toBe('active');
    expect(contract.createdAt).toBe('2026-11-21T12:00:00.000Z');
  });

  it('createUserMembership persists membership and returns validated contract', async () => {
    const { db, store } = createMockDb();

    const created = await createUserMembership(db, {
      userId: 'user_01h8abc1234567890123456789',
      studioId: 'studio_alpha',
      role: 'studio_owner',
    });

    expect(created.userId).toBe('user_01h8abc1234567890123456789');
    expect(created.studioId).toBe('studio_alpha');
    expect(created.role).toBe('studio_owner');
    expect(created.status).toBe('active');
    expect(store[0].createdAt).toBeInstanceOf(Date);
  });

  it('findUserMemberships filters by userId and active status', async () => {
    const { db } = createMockDb();

    await createUserMembership(db, {
      userId: 'user_target',
      studioId: 'studio_1',
      role: 'studio_owner',
    });
    await createUserMembership(db, {
      userId: 'user_target',
      studioId: 'studio_2',
      role: 'studio_staff',
      status: 'suspended',
    });
    await createUserMembership(db, {
      userId: 'user_other',
      studioId: 'studio_3',
      role: 'studio_staff',
    });

    const activeMemberships = await findUserMemberships(db, 'user_target');
    expect(activeMemberships).toHaveLength(1);
    expect(activeMemberships[0].studioId).toBe('studio_1');
  });

  it('findUserMembershipForStudio finds exact user-studio membership regardless of status', async () => {
    const { db } = createMockDb();

    await createUserMembership(db, {
      userId: 'user_u1',
      studioId: 'studio_s1',
      role: 'studio_staff',
      status: 'suspended',
    });

    const membership = await findUserMembershipForStudio(db, 'user_u1', 'studio_s1');
    expect(membership).not.toBeNull();
    expect(membership?.status).toBe('suspended');
    expect(membership?.role).toBe('studio_staff');

    const missing = await findUserMembershipForStudio(db, 'user_u1', 'studio_other');
    expect(missing).toBeNull();
  });

  it('findMembershipsByStudio and updateMembershipStatus manage studio roster', async () => {
    const { db } = createMockDb();

    await createUserMembership(db, {
      userId: 'user_u1',
      studioId: 's_alpha',
      role: 'studio_owner',
    });
    await createUserMembership(db, {
      userId: 'user_u2',
      studioId: 's_alpha',
      role: 'studio_staff',
    });
    await createUserMembership(db, { userId: 'user_u3', studioId: 's_beta', role: 'studio_staff' });

    const roster = await findMembershipsByStudio(db, 's_alpha');
    expect(roster).toHaveLength(2);
    expect(roster.map((m) => m.userId)).toEqual(['user_u1', 'user_u2']);

    const updated = await updateMembershipStatus(db, 'user_u2', 's_alpha', 'suspended');
    expect(updated).toBe(true);

    const recheck = await findUserMembershipForStudio(db, 'user_u2', 's_alpha');
    expect(recheck?.status).toBe('suspended');
  });
});
