import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  deleteSessionPhoto,
  getPhotoPreviewUrl,
  listSessionPhotos,
  requestUploadIntent,
  uploadPhotoBinary,
} from './upload-client.js';

describe('Upload Client Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds canonical preview URL correctly', () => {
    const url = getPhotoPreviewUrl('koramangala-studio', 'sess_123', 'asset_abc');
    expect(url).toContain(
      '/public/studios/koramangala-studio/sessions/sess_123/assets/asset_abc/preview'
    );
  });

  it('appends token query parameter when provided', () => {
    const url = getPhotoPreviewUrl('koramangala-studio', 'sess_123', 'asset_abc', 'my-token-123');
    expect(url).toContain(
      '/public/studios/koramangala-studio/sessions/sess_123/assets/asset_abc/preview?token=my-token-123'
    );
  });

  it('requests upload intent successfully', async () => {
    const mockIntent = {
      assetId: 'asset_1234567890123456',
      storageKey: 'studios/s1/sessions/sess1/asset_1/test.png',
      uploadUrl: '/public/studios/s1/sessions/sess1/assets/upload',
      expiresAt: new Date().toISOString(),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIntent,
    });

    const res = await requestUploadIntent(
      's1',
      'sess1',
      { filename: 'test.png', fileSizeBytes: 1024, mimeType: 'image/png' },
      'valid.token',
      mockFetch as unknown as typeof fetch
    );

    expect(res.assetId).toBe('asset_1234567890123456');
    expect(res.storageKey).toBeDefined();
  });

  it('uploads binary photo and parses asset record', async () => {
    const mockAsset = {
      assetId: 'asset_1234567890123456',
      studioId: 'studio_alpha',
      sessionId: 'sess_valid_1234567890',
      originalFilename: 'test.png',
      mimeType: 'image/png',
      fileSizeBytes: 1024,
      widthPx: 800,
      heightPx: 600,
      storageKey: 'studios/studio_alpha/sessions/sess_valid_1234567890/asset_1/test.png',
      createdAt: new Date().toISOString(),
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockAsset,
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'test.png', { type: 'image/png' });
    const result = await uploadPhotoBinary(
      '/public/studios/s1/sessions/sess_1/assets/upload',
      file,
      'token',
      undefined,
      mockFetch as unknown as typeof fetch
    );

    expect(result.assetId).toBe('asset_1234567890123456');
    expect(result.widthPx).toBe(800);
  });

  it('lists session photos and deletes photo successfully', async () => {
    const mockList = {
      assets: [
        {
          assetId: 'asset_1111111111111111',
          studioId: 'studio_alpha',
          sessionId: 'sess_valid_1234567890',
          originalFilename: 'photo.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 2048,
          storageKey: 'studios/s1/sessions/sess_valid/asset_1/photo.jpg',
          createdAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockList,
    });

    const photos = await listSessionPhotos(
      's1',
      'sess_1',
      'token',
      mockFetch as unknown as typeof fetch
    );
    expect(photos).toHaveLength(1);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await expect(
      deleteSessionPhoto(
        's1',
        'sess_1',
        'asset_1111111111111111',
        'token',
        mockFetch as unknown as typeof fetch
      )
    ).resolves.not.toThrow();
  });
});
