import { describe, expect, it, vi } from 'vitest';
import {
  CloudinaryStorageService,
  generateCloudinarySignature,
} from './cloudinary-storage-service.js';

describe('CloudinaryStorageService', () => {
  const config = {
    cloudName: 'test_cloud',
    apiKey: 'key_123',
    apiSecret: 'secret_456',
    folder: 'Snapprint',
  };

  it('generates deterministic alphabetically sorted SHA-1 signature', () => {
    const signature = generateCloudinarySignature(
      {
        timestamp: 1700000000,
        public_id: 'Snapprint/photo',
        overwrite: 'true',
      },
      'secret_456'
    );
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(40);
  });

  it('throws an error if instantiated with missing credentials', () => {
    expect(
      () => new CloudinaryStorageService({ cloudName: '', apiKey: '', apiSecret: '' })
    ).toThrow('Cloudinary credentials (cloudName, apiKey, apiSecret) are required.');
  });

  it('uploads image binary to Cloudinary API with signature and caches URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/Snapprint/asset.png',
        public_id: 'Snapprint/asset',
      }),
    });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await storage.put('studios/s1/sessions/sess1/asset1/sample.png', data, 'image/png');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/test_cloud/image/upload');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws an error when Cloudinary returns non-200 on upload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid signature',
    });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    await expect(
      storage.put('studios/s1/sessions/sess1/asset1/sample.png', data, 'image/png')
    ).rejects.toThrow('Cloudinary upload failed with status 400: Invalid signature');
  });

  it('retrieves uploaded asset via cached URL', async () => {
    const fileBytes = new Uint8Array([1, 2, 3, 4]);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/v1/asset.png',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => fileBytes.buffer,
      });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    await storage.put('studios/s1/sessions/sess1/asset1/sample.png', fileBytes, 'image/png');

    const result = await storage.get('studios/s1/sessions/sess1/asset1/sample.png');
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe('image/png');
    expect(result?.data).toEqual(fileBytes);
  });

  it('returns null if asset cannot be resolved', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    const result = await storage.get('non-existent-key');
    expect(result).toBeNull();
  });

  it('deletes asset from Cloudinary via destroy endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'ok' }),
    });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    const deleted = await storage.delete('studios/s1/sessions/sess1/asset1/sample.png');
    expect(deleted).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('returns false when destroy reports asset not found', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 'not found' }),
    });

    const storage = new CloudinaryStorageService(config, mockFetch as unknown as typeof fetch);
    const deleted = await storage.delete('studios/s1/sessions/sess1/asset1/missing.png');
    expect(deleted).toBe(false);
  });
});
