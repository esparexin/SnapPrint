import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createStorageService,
  LocalDiskStorageService,
  MemoryStorageService,
} from './storage-service.js';
import { CloudinaryStorageService } from './cloudinary-storage-service.js';

describe('Storage Service Implementation', () => {
  it('stores, retrieves and deletes private assets securely in memory', async () => {
    const storage = new MemoryStorageService(true);
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const key = 'studios/std_1/sessions/sess_1/asset_1/sample.png';
    await storage.put(key, data, 'image/png');

    const retrieved = await storage.get(key);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.mimeType).toBe('image/png');
    expect(retrieved?.data).toEqual(data);

    const deleted = await storage.delete(key);
    expect(deleted).toBe(true);

    const afterDelete = await storage.get(key);
    expect(afterDelete).toBeNull();
  });

  it('stores, retrieves and deletes private assets securely on local disk', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'snapprint-storage-test-'));
    try {
      const storage = new LocalDiskStorageService(tempDir);
      const data = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const key = 'studios/std_disk/sessions/sess_disk/doc.pdf';

      await storage.put(key, data, 'application/pdf');

      const retrieved = await storage.get(key);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.mimeType).toBe('application/pdf');
      expect(retrieved?.data).toEqual(data);

      const deleted = await storage.delete(key);
      expect(deleted).toBe(true);

      const afterDelete = await storage.get(key);
      expect(afterDelete).toBeNull();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('factory selects LocalDiskStorageService in production and MemoryStorageService in development', () => {
    const prodStorage = createStorageService({ nodeEnv: 'production' });
    expect(prodStorage).toBeInstanceOf(LocalDiskStorageService);

    const devStorage = createStorageService({ nodeEnv: 'development' });
    expect(devStorage).toBeInstanceOf(MemoryStorageService);
  });

  it('factory selects CloudinaryStorageService when Cloudinary credentials are provided', () => {
    const storage = createStorageService({
      cloudinaryCloudName: 'test_cloud',
      cloudinaryApiKey: '1234567890',
      cloudinaryApiSecret: 'test_secret',
    });
    expect(storage).toBeInstanceOf(CloudinaryStorageService);
  });

  it('MemoryStorageService strictly forbids production instantiation without explicit opt-in', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() => new MemoryStorageService()).toThrow(
        'MemoryStorageService is not permitted in production'
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
