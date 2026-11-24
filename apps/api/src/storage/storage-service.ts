import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CloudinaryStorageService } from './cloudinary-storage-service.js';

export interface StorageService {
  put(storageKey: string, data: Uint8Array, mimeType: string): Promise<void>;
  get(storageKey: string): Promise<{ data: Uint8Array; mimeType: string } | null>;
  delete(storageKey: string): Promise<boolean>;
}

export class MemoryStorageService implements StorageService {
  private store = new Map<string, { data: Uint8Array; mimeType: string }>();

  constructor(private readonly allowInProduction = false) {
    if (!this.allowInProduction && process.env.NODE_ENV === 'production') {
      throw new Error(
        'MemoryStorageService is not permitted in production. Use LocalDiskStorageService or a persistent storage provider.'
      );
    }
  }

  async put(storageKey: string, data: Uint8Array, mimeType: string): Promise<void> {
    this.store.set(storageKey, { data: new Uint8Array(data), mimeType });
  }

  async get(storageKey: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const item = this.store.get(storageKey);
    return item ? { data: new Uint8Array(item.data), mimeType: item.mimeType } : null;
  }

  async delete(storageKey: string): Promise<boolean> {
    return this.store.delete(storageKey);
  }
}

export class LocalDiskStorageService implements StorageService {
  constructor(private baseDir: string = resolve(process.cwd(), '.storage/private')) {}

  private resolvePath(storageKey: string): string {
    const safeKey = storageKey.replace(/\.\./g, '');
    return resolve(this.baseDir, safeKey);
  }

  async put(storageKey: string, data: Uint8Array, mimeType: string): Promise<void> {
    const filePath = this.resolvePath(storageKey);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    await fs.writeFile(`${filePath}.meta`, JSON.stringify({ mimeType }));
  }

  async get(storageKey: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const filePath = this.resolvePath(storageKey);
    try {
      const data = await fs.readFile(filePath);
      const metaRaw = await fs.readFile(`${filePath}.meta`, 'utf-8').catch(() => '{}');
      const meta = JSON.parse(metaRaw);
      return { data: new Uint8Array(data), mimeType: meta.mimeType || 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<boolean> {
    const filePath = this.resolvePath(storageKey);
    try {
      await fs.unlink(filePath);
      await fs.unlink(`${filePath}.meta`).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }
}

let defaultStorageService: StorageService = new MemoryStorageService(true);

export function getStorageService(): StorageService {
  return defaultStorageService;
}

export function setStorageService(service: StorageService): void {
  defaultStorageService = service;
}

export interface StorageConfig {
  nodeEnv?: string;
  storageBaseDir?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryFolder?: string;
}

export function createStorageService(
  config: StorageConfig = {},
  customFetch: typeof fetch = fetch
): StorageService {
  if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    return new CloudinaryStorageService(
      {
        cloudName: config.cloudinaryCloudName,
        apiKey: config.cloudinaryApiKey,
        apiSecret: config.cloudinaryApiSecret,
        folder: config.cloudinaryFolder,
      },
      customFetch
    );
  }
  if (config.nodeEnv === 'production') {
    return new LocalDiskStorageService(config.storageBaseDir);
  }
  return new MemoryStorageService(true);
}

export function initializeStorageService(
  config: StorageConfig = {},
  customFetch: typeof fetch = fetch
): StorageService {
  const service = createStorageService(config, customFetch);
  setStorageService(service);
  return service;
}
