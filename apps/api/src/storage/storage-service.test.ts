import { describe, expect, it } from 'vitest';
import { MemoryStorageService } from './storage-service.js';

describe('Storage Service Implementation', () => {
  it('stores, retrieves and deletes private assets securely', async () => {
    const storage = new MemoryStorageService();
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
});
