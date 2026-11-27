import { describe, expect, it } from 'vitest';
import { Db } from 'mongodb';
import {
  createStudio,
  findStudioById,
  findStudioBySlug,
  findStudiosByIds,
  StudioDocument,
  updateStudioSettings,
  updateStudioStatus,
} from './studio.repository.js';

function createMockDb() {
  const store: StudioDocument[] = [];
  let queryCount = 0;

  const collection = {
    async insertOne(doc: StudioDocument) {
      queryCount++;
      store.push({ ...doc });
      return { acknowledged: true, insertedId: doc.id };
    },
    async findOne(filter: { id?: string; slug?: string }) {
      queryCount++;
      const item = store.find((s) => {
        if (filter.id && s.id !== filter.id) return false;
        if (filter.slug && s.slug !== filter.slug) return false;
        return true;
      });
      return item ? { ...item } : null;
    },
    find(filter: { id?: { $in: string[] } }) {
      queryCount++;
      const items = store.filter((s) => {
        if (filter.id?.$in && !filter.id.$in.includes(s.id)) return false;
        return true;
      });
      return { toArray: async () => items.map((i) => ({ ...i })) };
    },
    async updateOne(filter: { id: string }, update: { $set: Partial<StudioDocument> }) {
      queryCount++;
      const item = store.find((s) => s.id === filter.id);
      if (!item) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(item, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };

  const db = { collection: () => collection } as unknown as Db;
  return { db, store, getQueryCount: () => queryCount };
}

describe('Studio Persistence Repository', () => {
  it('createStudio persists studio with BSON dates and returns Studio contract', async () => {
    const { db, store, getQueryCount } = createMockDb();

    const created = await createStudio(db, {
      id: 'studio_alpha',
      slug: 'studio-alpha',
      name: 'Alpha Photo Studio',
    });

    expect(created.id).toBe('studio_alpha');
    expect(created.slug).toBe('studio-alpha');
    expect(created.status).toBe('active');
    expect(created.settings.currency).toBe('INR');
    expect(created.settings.maxActivePrinters).toBeUndefined();
    expect(store[0].createdAt).toBeInstanceOf(Date);
    expect(getQueryCount()).toBe(1);
  });

  it('findStudioById performs indexed lookup and returns public contract', async () => {
    const { db } = createMockDb();

    await createStudio(db, {
      id: 'studio_beta',
      slug: 'studio-beta',
      name: 'Beta Prints',
    });

    const found = await findStudioById(db, 'studio_beta');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Beta Prints');

    const missing = await findStudioById(db, 'studio_nonexistent');
    expect(missing).toBeNull();
  });

  it('findStudiosByIds queries multiple studios in single indexed operation', async () => {
    const { db, getQueryCount } = createMockDb();

    await createStudio(db, { id: 'studio_s1', slug: 'studio-s1', name: 'Studio 1' });
    await createStudio(db, { id: 'studio_s2', slug: 'studio-s2', name: 'Studio 2' });
    await createStudio(db, { id: 'studio_s3', slug: 'studio-s3', name: 'Studio 3' });

    const studios = await findStudiosByIds(db, ['studio_s1', 'studio_s3']);
    expect(studios).toHaveLength(2);
    expect(studios.map((s) => s.id)).toEqual(['studio_s1', 'studio_s3']);
    expect(getQueryCount()).toBe(4); // 3 inserts + 1 find
  });

  it('updateStudioSettings and updateStudioStatus update documents safely', async () => {
    const { db } = createMockDb();

    await createStudio(db, { id: 'studio_s1', slug: 'studio-s1', name: 'Studio 1' });

    const updated = await updateStudioSettings(db, 'studio_s1', { autoApproveOrders: true });
    expect(updated?.settings.autoApproveOrders).toBe(true);
    expect(updated?.settings.currency).toBe('INR');

    const statusUpdated = await updateStudioStatus(db, 'studio_s1', 'suspended');
    expect(statusUpdated).toBe(true);

    const suspended = await findStudioById(db, 'studio_s1');
    expect(suspended?.status).toBe('suspended');
  });

  it('findStudioBySlug resolves studio by stable slug and validates slug format', async () => {
    const { db, getQueryCount } = createMockDb();

    await createStudio(db, {
      id: 'studio_delta',
      slug: 'studio-delta',
      name: 'Delta Photography',
    });

    const found = await findStudioBySlug(db, 'studio-delta');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('studio_delta');
    expect(found?.name).toBe('Delta Photography');

    const notFound = await findStudioBySlug(db, 'unknown-studio');
    expect(notFound).toBeNull();

    // Invalid slug format returns null early without querying DB
    const beforeCount = getQueryCount();
    const invalidFormat = await findStudioBySlug(db, 'INVALID_SLUG!');
    expect(invalidFormat).toBeNull();
    expect(getQueryCount()).toBe(beforeCount);
  });
});
