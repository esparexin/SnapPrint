import { describe, expect, it } from 'vitest';
import { Db } from 'mongodb';
import {
  countPhotoAssetsBySession,
  createPhotoAssetRecord,
  deletePhotoAssetRecord,
  findPhotoAssetById,
  listPhotoAssetsBySession,
  PhotoAssetDocument,
} from './photo-asset.repository.js';

function createMockAssetDb() {
  const store: PhotoAssetDocument[] = [];
  let queryCount = 0;

  const collection = {
    async insertOne(doc: PhotoAssetDocument) {
      queryCount++;
      store.push({ ...doc });
      return { acknowledged: true, insertedId: doc.assetId };
    },
    async findOne(filter: { studioId?: string; sessionId?: string; assetId?: string }) {
      queryCount++;
      const item = store.find((a) => {
        if (filter.studioId && a.studioId !== filter.studioId) return false;
        if (filter.sessionId && a.sessionId !== filter.sessionId) return false;
        if (filter.assetId && a.assetId !== filter.assetId) return false;
        return true;
      });
      return item ? { ...item } : null;
    },
    find(filter: { studioId?: string; sessionId?: string }) {
      queryCount++;
      const items = store.filter((a) => {
        if (filter.studioId && a.studioId !== filter.studioId) return false;
        if (filter.sessionId && a.sessionId !== filter.sessionId) return false;
        return true;
      });
      return {
        sort: () => ({
          toArray: async () => items.map((i) => ({ ...i })),
        }),
      };
    },
    async countDocuments(filter: { studioId?: string; sessionId?: string }) {
      queryCount++;
      return store.filter((a) => {
        if (filter.studioId && a.studioId !== filter.studioId) return false;
        if (filter.sessionId && a.sessionId !== filter.sessionId) return false;
        return true;
      }).length;
    },
    async deleteOne(filter: { studioId?: string; sessionId?: string; assetId?: string }) {
      queryCount++;
      const index = store.findIndex((a) => {
        if (filter.studioId && a.studioId !== filter.studioId) return false;
        if (filter.sessionId && a.sessionId !== filter.sessionId) return false;
        if (filter.assetId && a.assetId !== filter.assetId) return false;
        return true;
      });
      if (index === -1) return { deletedCount: 0 };
      store.splice(index, 1);
      return { deletedCount: 1 };
    },
  };

  const db = { collection: () => collection } as unknown as Db;
  return { db, store, getQueryCount: () => queryCount };
}

describe('Photo Asset Persistence Repository', () => {
  it('creates and finds photo asset scoped strictly to studio and session', async () => {
    const { db } = createMockAssetDb();

    const created = await createPhotoAssetRecord(db, {
      assetId: 'asset_1234567890123456',
      studioId: 'studio_alpha',
      sessionId: 'sess_1234567890123456',
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024,
      widthPx: 800,
      heightPx: 600,
      storageKey: 'studios/studio_alpha/sessions/sess_1234567890123456/asset_1/test.jpg',
      createdAt: new Date().toISOString(),
    });

    expect(created.assetId).toBe('asset_1234567890123456');

    // Matching studio and session
    const found = await findPhotoAssetById(
      db,
      'studio_alpha',
      'sess_1234567890123456',
      'asset_1234567890123456'
    );
    expect(found).not.toBeNull();
    expect(found?.originalFilename).toBe('test.jpg');

    // Mismatched studio fails closed
    const crossStudio = await findPhotoAssetById(
      db,
      'studio_beta',
      'sess_1234567890123456',
      'asset_1234567890123456'
    );
    expect(crossStudio).toBeNull();
  });

  it('lists and counts assets by session with deletion', async () => {
    const { db } = createMockAssetDb();

    await createPhotoAssetRecord(db, {
      assetId: 'asset_1111111111111111',
      studioId: 'studio_alpha',
      sessionId: 'sess_active_12345678',
      originalFilename: 'one.png',
      mimeType: 'image/png',
      fileSizeBytes: 2048,
      storageKey: 'studios/studio_alpha/sessions/sess_active_12345678/asset_111/one.png',
      createdAt: new Date().toISOString(),
    });

    const count = await countPhotoAssetsBySession(db, 'studio_alpha', 'sess_active_12345678');
    expect(count).toBe(1);

    const list = await listPhotoAssetsBySession(db, 'studio_alpha', 'sess_active_12345678');
    expect(list).toHaveLength(1);

    const deleted = await deletePhotoAssetRecord(
      db,
      'studio_alpha',
      'sess_active_12345678',
      'asset_1111111111111111'
    );
    expect(deleted).toBe(true);

    const countAfter = await countPhotoAssetsBySession(db, 'studio_alpha', 'sess_active_12345678');
    expect(countAfter).toBe(0);
  });
});
