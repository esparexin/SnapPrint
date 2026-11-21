import { describe, expect, it } from 'vitest';
import { Db } from 'mongodb';
import { OperatorSession } from '@snapprint/contracts';
import {
  createOperatorSession,
  findActiveOperatorSession,
  findOperatorSessionByToken,
  OperatorSessionDocument,
  revokeAllUserSessions,
  revokeOperatorSession,
  toOperatorSessionContract,
  toOperatorSessionDocument,
  touchOperatorSession,
} from './operator-session.repository.js';

function createMockDb() {
  const store: OperatorSessionDocument[] = [];
  let queryCount = 0;

  const collection = {
    async insertOne(doc: OperatorSessionDocument) {
      queryCount++;
      store.push({ ...doc });
      return { acknowledged: true, insertedId: doc.sessionId };
    },
    async findOne(filter: { sessionId?: string; status?: string; expiresAt?: { $gt: Date } }) {
      queryCount++;
      const session = store.find((s) => {
        if (filter.sessionId && s.sessionId !== filter.sessionId) return false;
        if (filter.status && s.status !== filter.status) return false;
        if (filter.expiresAt?.$gt && s.expiresAt.getTime() <= filter.expiresAt.$gt.getTime())
          return false;
        return true;
      });
      return session ? { ...session } : null;
    },
    async updateOne(
      filter: { sessionId: string; userId?: string; status?: string },
      update: { $set: Partial<OperatorSessionDocument> }
    ) {
      queryCount++;
      const session = store.find((s) => {
        if (s.sessionId !== filter.sessionId) return false;
        if (filter.userId && s.userId !== filter.userId) return false;
        if (filter.status && s.status !== filter.status) return false;
        return true;
      });
      if (!session) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(session, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async updateMany(
      filter: { userId: string; status?: string },
      update: { $set: Partial<OperatorSessionDocument> }
    ) {
      queryCount++;
      let modified = 0;
      for (const session of store) {
        if (
          session.userId === filter.userId &&
          (!filter.status || session.status === filter.status)
        ) {
          Object.assign(session, update.$set);
          modified++;
        }
      }
      return { matchedCount: modified, modifiedCount: modified };
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

describe('Operator Session Persistence & Lifecycle', () => {
  const sampleContract: OperatorSession = {
    sessionId: 'session_hashed_token_abcdef1234567890',
    userId: 'user_01h8abc1234567890123456789',
    status: 'active',
    createdAt: '2026-11-21T12:00:00.000Z',
    expiresAt: '2026-11-22T12:00:00.000Z',
    lastActiveAt: '2026-11-21T12:00:00.000Z',
  };

  it('toOperatorSessionDocument converts ISO timestamps to native BSON Dates for TTL indexing', () => {
    const doc = toOperatorSessionDocument(sampleContract);

    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.lastActiveAt).toBeInstanceOf(Date);
    expect(doc.expiresAt.getTime()).toBe(new Date('2026-11-22T12:00:00.000Z').getTime());
  });

  it('toOperatorSessionDocument throws on invalid timestamp values', () => {
    expect(() =>
      toOperatorSessionDocument({
        ...sampleContract,
        expiresAt: 'not-a-date',
      })
    ).toThrow('Invalid timestamp provided for operator session persistence');
  });

  it('toOperatorSessionContract maps BSON Dates back to validated ISO strings', () => {
    const doc: OperatorSessionDocument = {
      sessionId: 'session_hashed_token_abcdef1234567890',
      userId: 'user_01h8abc1234567890123456789',
      status: 'active',
      createdAt: new Date('2026-11-21T12:00:00.000Z'),
      expiresAt: new Date('2026-11-22T12:00:00.000Z'),
      lastActiveAt: new Date('2026-11-21T12:00:00.000Z'),
    };

    const contract = toOperatorSessionContract(doc);
    expect(contract.createdAt).toBe('2026-11-21T12:00:00.000Z');
    expect(contract.expiresAt).toBe('2026-11-22T12:00:00.000Z');
    expect(contract.lastActiveAt).toBe('2026-11-21T12:00:00.000Z');
  });

  it('createOperatorSession inserts with native BSON Date and single database operation', async () => {
    const { db, store, getQueryCount } = createMockDb();

    const created = await createOperatorSession(db, sampleContract);
    expect(created.sessionId).toBe(sampleContract.sessionId);
    expect(store[0].expiresAt).toBeInstanceOf(Date);
    expect(getQueryCount()).toBe(1); // Single database insert
  });

  it('findActiveOperatorSession rejects expired sessions at query and application level', async () => {
    const { db } = createMockDb();

    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_expired_token_1234567890',
      expiresAt: pastDate,
    });

    const active = await findActiveOperatorSession(db, 'session_expired_token_1234567890');
    expect(active).toBeNull();
  });

  it('findActiveOperatorSession rejects revoked sessions', async () => {
    const { db } = createMockDb();

    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_revoked_token_1234567890',
      status: 'revoked',
    });

    const active = await findActiveOperatorSession(db, 'session_revoked_token_1234567890');
    expect(active).toBeNull();

    const foundByToken = await findOperatorSessionByToken(db, 'session_revoked_token_1234567890');
    expect(foundByToken).not.toBeNull();
    expect(foundByToken?.status).toBe('revoked');
  });

  it('revokeOperatorSession enforces user ownership and rejects cross-user revocation', async () => {
    const { db, store } = createMockDb();

    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_user_a_1234567',
      userId: 'user_01h8_user_a',
    });

    // Attempting to revoke user_a's session with user_b's ID fails
    const unauthorizedRevoke = await revokeOperatorSession(
      db,
      'session_user_a_1234567',
      'user_01h8_user_b'
    );
    expect(unauthorizedRevoke).toBe(false);
    expect(store[0].status).toBe('active');

    // Revoking with correct userId succeeds
    const authorizedRevoke = await revokeOperatorSession(
      db,
      'session_user_a_1234567',
      'user_01h8_user_a'
    );
    expect(authorizedRevoke).toBe(true);
    expect(store[0].status).toBe('revoked');
  });

  it('revokeAllUserSessions revokes all active sessions for a user', async () => {
    const { db, store } = createMockDb();

    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_user_1_1234567',
      userId: 'user_target',
    });
    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_user_2_1234567',
      userId: 'user_target',
    });
    await createOperatorSession(db, {
      ...sampleContract,
      sessionId: 'session_other_user_123',
      userId: 'user_other',
    });

    const revokedCount = await revokeAllUserSessions(db, 'user_target');
    expect(revokedCount).toBe(2);

    expect(store[0].status).toBe('revoked');
    expect(store[1].status).toBe('revoked');
    expect(store[2].status).toBe('active'); // Unaffected
  });

  it('touchOperatorSession updates lastActiveAt for active sessions', async () => {
    const { db, store } = createMockDb();

    await createOperatorSession(db, sampleContract);
    const newTouch = new Date('2026-11-21T13:00:00.000Z');
    const touched = await touchOperatorSession(db, sampleContract.sessionId, newTouch);

    expect(touched).toBe(true);
    expect(store[0].lastActiveAt).toEqual(newTouch);
  });
});
