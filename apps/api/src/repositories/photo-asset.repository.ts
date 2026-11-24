import { Db } from 'mongodb';
import { AllowedMimeType, PhotoAsset, PhotoAssetSchema } from '@snapprint/contracts';

export const PHOTO_ASSETS_COLLECTION = 'photo_assets';

export interface PhotoAssetDocument {
  assetId: string;
  studioId: string;
  sessionId: string;
  originalFilename: string;
  mimeType: AllowedMimeType;
  fileSizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  pageCount?: number;
  storageKey: string;
  createdAt: Date;
}

export function toPhotoAssetContract(doc: PhotoAssetDocument): PhotoAsset {
  return PhotoAssetSchema.parse({
    assetId: doc.assetId,
    studioId: doc.studioId,
    sessionId: doc.sessionId,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    widthPx: doc.widthPx,
    heightPx: doc.heightPx,
    pageCount: doc.pageCount,
    storageKey: doc.storageKey,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
  });
}

export async function createPhotoAssetRecord(db: Db, asset: PhotoAsset): Promise<PhotoAsset> {
  const parsed = PhotoAssetSchema.parse(asset);
  const now = new Date(parsed.createdAt);

  const doc: PhotoAssetDocument = {
    assetId: parsed.assetId,
    studioId: parsed.studioId,
    sessionId: parsed.sessionId,
    originalFilename: parsed.originalFilename,
    mimeType: parsed.mimeType,
    fileSizeBytes: parsed.fileSizeBytes,
    widthPx: parsed.widthPx,
    heightPx: parsed.heightPx,
    pageCount: parsed.pageCount,
    storageKey: parsed.storageKey,
    createdAt: Number.isNaN(now.getTime()) ? new Date() : now,
  };

  await db.collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION).insertOne(doc);
  return toPhotoAssetContract(doc);
}

export async function findPhotoAssetById(
  db: Db,
  studioId: string,
  sessionId: string,
  assetId: string
): Promise<PhotoAsset | null> {
  const doc = await db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .findOne({ studioId, sessionId, assetId }, { projection: { _id: 0 } });

  return doc ? toPhotoAssetContract(doc) : null;
}

export async function findPhotoAssetsByIds(
  db: Db,
  studioId: string,
  sessionId: string,
  assetIds: string[]
): Promise<Map<string, PhotoAsset>> {
  if (assetIds.length === 0) return new Map();

  const docs = await db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .find({ studioId, sessionId, assetId: { $in: assetIds } }, { projection: { _id: 0 } })
    .toArray();

  const map = new Map<string, PhotoAsset>();
  for (const doc of docs) {
    map.set(doc.assetId, toPhotoAssetContract(doc));
  }
  return map;
}

export async function listPhotoAssetsBySession(
  db: Db,
  studioId: string,
  sessionId: string
): Promise<PhotoAsset[]> {
  const docs = await db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .find({ studioId, sessionId }, { projection: { _id: 0 } })
    .sort({ createdAt: 1 })
    .toArray();

  return docs.map(toPhotoAssetContract);
}

export async function countPhotoAssetsBySession(
  db: Db,
  studioId: string,
  sessionId: string
): Promise<number> {
  return db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .countDocuments({ studioId, sessionId });
}

export async function deletePhotoAssetRecord(
  db: Db,
  studioId: string,
  sessionId: string,
  assetId: string
): Promise<boolean> {
  const result = await db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .deleteOne({ studioId, sessionId, assetId });

  return result.deletedCount > 0;
}

export async function findPhotoAssetByStudioAndAssetId(
  db: Db,
  studioId: string,
  assetId: string
): Promise<PhotoAsset | null> {
  const doc = await db
    .collection<PhotoAssetDocument>(PHOTO_ASSETS_COLLECTION)
    .findOne({ studioId, assetId }, { projection: { _id: 0 } });

  return doc ? toPhotoAssetContract(doc) : null;
}

