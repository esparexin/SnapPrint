import { describe, expect, it } from 'vitest';
import { PhotoAssetSchema, UploadLimits } from './assets.js';

describe('Assets & Upload Contracts', () => {
  it('validates supported image formats', () => {
    const asset = {
      assetId: 'asset_1234567890123456',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef123456',
      originalFilename: 'family_photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 4 * 1024 * 1024,
      widthPx: 4000,
      heightPx: 3000,
      storageKey: 'studios/std_koramangala/sessions/sess_123/photos/asset_123.jpg',
      createdAt: new Date().toISOString(),
    };
    expect(PhotoAssetSchema.safeParse(asset).success).toBe(true);
  });

  it('rejects unsupported mime types', () => {
    const asset = {
      assetId: 'asset_1234567890123456',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef123456',
      originalFilename: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      fileSizeBytes: 1000,
      storageKey: 'studios/std_koramangala/sessions/sess_123/photos/asset_123.exe',
      createdAt: new Date().toISOString(),
    };
    expect(PhotoAssetSchema.safeParse(asset).success).toBe(false);
  });

  it('rejects files exceeding max size limit', () => {
    const asset = {
      assetId: 'asset_1234567890123456',
      studioId: 'std_koramangala',
      sessionId: 'sess_1234567890abcdef123456',
      originalFilename: 'giant.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: UploadLimits.maxFileSize + 1,
      storageKey: 'studios/std_koramangala/sessions/sess_123/photos/giant.jpg',
      createdAt: new Date().toISOString(),
    };
    expect(PhotoAssetSchema.safeParse(asset).success).toBe(false);
  });
});
