import { describe, expect, it } from 'vitest';
import { Db } from 'mongodb';
import {
  createUser,
  findInternalUserById,
  findPublicUserByEmail,
  findUserByEmail,
  findUserById,
  recordFailedLogin,
  resetFailedLogins,
  toPublicUser,
  toUserWithPasswordHash,
  updateUserStatus,
  UserDocument,
} from './user.repository.js';

function createMockDb() {
  const store: UserDocument[] = [];
  let queryCount = 0;

  const collection = {
    async insertOne(doc: UserDocument) {
      queryCount++;
      if (store.some((u) => u.email === doc.email)) {
        const error = new Error('E11000 duplicate email');
        (error as unknown as { code: number }).code = 11000;
        throw error;
      }
      if (store.some((u) => u.id === doc.id)) {
        const error = new Error('E11000 duplicate uid_user_id');
        (error as unknown as { code: number }).code = 11000;
        throw error;
      }
      store.push({ ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    async findOne(
      filter: { id?: string; email?: string },
      options?: { projection?: Record<string, number> }
    ) {
      queryCount++;
      const user = store.find(
        (u) => (!filter.id || u.id === filter.id) && (!filter.email || u.email === filter.email)
      );
      if (!user) return null;
      const clone = { ...user };
      if (options?.projection?.passwordHash === 0)
        delete (clone as Partial<UserDocument>).passwordHash;
      return clone;
    },
    async updateOne(
      filter: { id: string },
      update: { $set?: Partial<UserDocument>; $inc?: Record<string, number> }
    ) {
      queryCount++;
      const user = store.find((u) => u.id === filter.id);
      if (!user) return { matchedCount: 0, modifiedCount: 0 };
      if (update.$set) Object.assign(user, update.$set);
      if (update.$inc) {
        for (const [key, inc] of Object.entries(update.$inc)) {
          const current = (user as unknown as Record<string, number>)[key] ?? 0;
          (user as unknown as Record<string, number>)[key] = current + inc;
        }
      }
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };

  const db = {
    collection: () => collection,
  } as unknown as Db;

  return {
    db,
    store,
    getQueryCount: () => queryCount,
    resetQueryCount: () => {
      queryCount = 0;
    },
  };
}

describe('User Persistence Repository', () => {
  const sampleUserDoc: UserDocument = {
    id: 'user_01h8abc1234567890123456789',
    email: 'operator@studio-alpha.com',
    name: 'Jane Doe',
    passwordHash: '$scrypt$N=16384,r=8,p=1$deadbeef$feedface',
    status: 'active',
    createdAt: new Date('2026-11-21T12:00:00.000Z'),
    updatedAt: new Date('2026-11-21T12:00:00.000Z'),
  };

  const baseInput = {
    id: 'user_01h8abc1234567890123456789',
    email: 'operator@studio.com',
    name: 'Operator',
    passwordHash: 'hash_secret',
  };

  it('toPublicUser strips passwordHash and internal fields, formatting ISO dates', () => {
    const publicUser = toPublicUser(sampleUserDoc);

    expect(publicUser.id).toBe(sampleUserDoc.id);
    expect(publicUser.email).toBe(sampleUserDoc.email);
    expect(publicUser.name).toBe(sampleUserDoc.name);
    expect(publicUser.status).toBe('active');
    expect(publicUser.createdAt).toBe('2026-11-21T12:00:00.000Z');
    expect((publicUser as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((publicUser as Record<string, unknown>)._id).toBeUndefined();
  });

  it('toUserWithPasswordHash retains passwordHash for internal authentication', () => {
    const internalUser = toUserWithPasswordHash(sampleUserDoc);
    expect(internalUser.passwordHash).toBe(sampleUserDoc.passwordHash);
    expect(internalUser.email).toBe(sampleUserDoc.email);
  });

  it('createUser normalizes email and returns safe public User without passwordHash', async () => {
    const { db, store, getQueryCount } = createMockDb();

    const created = await createUser(db, {
      ...baseInput,
      email: '  Jane.Doe@EXAMPLE.com  ',
      name: 'Jane Doe',
    });

    expect(created.email).toBe('jane.doe@example.com');
    expect(created.status).toBe('active');
    expect((created as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(store[0].email).toBe('jane.doe@example.com');
    expect(store[0].createdAt).toBeInstanceOf(Date);
    expect(getQueryCount()).toBe(1);
  });

  it('createUser rejects duplicate email and duplicate id safely', async () => {
    const { db } = createMockDb();
    await createUser(db, baseInput);

    await expect(
      createUser(db, {
        ...baseInput,
        id: 'user_01h8xyz9876543210987654321',
        email: 'OPERATOR@STUDIO.COM',
      })
    ).rejects.toThrow('User with email "operator@studio.com" already exists');

    await expect(createUser(db, { ...baseInput, email: 'other@studio.com' })).rejects.toThrow(
      'User with ID "user_01h8abc1234567890123456789" already exists'
    );
  });

  it('findUserByEmail normalizes email and performs single indexed lookup', async () => {
    const { db, resetQueryCount, getQueryCount } = createMockDb();
    await createUser(db, baseInput);

    resetQueryCount();
    const found = await findUserByEmail(db, 'OPERATOR@STUDIO.COM');
    expect(found).not.toBeNull();
    expect(found?.email).toBe('operator@studio.com');
    expect(found?.passwordHash).toBe('hash_secret');
    expect(getQueryCount()).toBe(1);
  });

  it('findPublicUserByEmail and findUserById exclude passwordHash projection', async () => {
    const { db } = createMockDb();
    await createUser(db, baseInput);

    const publicByEmail = await findPublicUserByEmail(db, 'operator@studio.com');
    expect(publicByEmail).not.toBeNull();
    expect((publicByEmail as Record<string, unknown>).passwordHash).toBeUndefined();

    const publicById = await findUserById(db, 'user_01h8abc1234567890123456789');
    expect(publicById).not.toBeNull();
    expect((publicById as Record<string, unknown>).passwordHash).toBeUndefined();

    const internalById = await findInternalUserById(db, 'user_01h8abc1234567890123456789');
    expect(internalById?.passwordHash).toBe('hash_secret');
  });

  it('updateUserStatus transitions status and touches updatedAt', async () => {
    const { db } = createMockDb();
    await createUser(db, baseInput);

    const updated = await updateUserStatus(db, 'user_01h8abc1234567890123456789', 'suspended');
    expect(updated).toBe(true);

    const suspendedUser = await findUserById(db, 'user_01h8abc1234567890123456789');
    expect(suspendedUser?.status).toBe('suspended');
  });

  it('recordFailedLogin and resetFailedLogins handle lockout counters atomically', async () => {
    const { db, store } = createMockDb();
    await createUser(db, baseInput);

    const lockTime = new Date(Date.now() + 15 * 60 * 1000);
    await recordFailedLogin(db, 'user_01h8abc1234567890123456789', lockTime);

    expect(store[0].failedLoginAttempts).toBe(1);
    expect(store[0].lockoutUntil).toEqual(lockTime);

    await resetFailedLogins(db, 'user_01h8abc1234567890123456789');
    expect(store[0].failedLoginAttempts).toBe(0);
    expect(store[0].lockoutUntil).toBeNull();
  });

  it('createUser supports passwordless user with contact and legal acceptance fields', async () => {
    const { db, store } = createMockDb();
    const created = await createUser(db, {
      id: 'user_01h8abc1234567890123456789',
      email: 'owner@studio.com',
      name: 'Studio Owner',
      phone: '+919876543210',
      termsAcceptedVersion: '2026-v1',
      termsAcceptedAt: '2026-11-21T12:00:00.000Z',
      privacyPolicyAcceptedVersion: '2026-v1',
      privacyPolicyAcceptedAt: '2026-11-21T12:00:00.000Z',
    });

    expect(created.email).toBe('owner@studio.com');
    expect(created.phone).toBe('+919876543210');
    expect(created.termsAcceptedVersion).toBe('2026-v1');
    expect(created.privacyPolicyAcceptedVersion).toBe('2026-v1');
    expect((created as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(store[0].passwordHash).toBeNull();
    expect(store[0].phone).toBe('+919876543210');
  });
});
