import { createHash } from 'node:crypto';
import { StorageService } from './storage-service.js';

export interface CloudinaryStorageConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

export function generateCloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((key) => `${key}=${params[key]}`).join('&');
  return createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
}

export class CloudinaryStorageService implements StorageService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly folder?: string;
  private readonly fetchFn: typeof fetch;
  private readonly urlCache = new Map<string, { secureUrl: string; mimeType: string }>();

  constructor(config: CloudinaryStorageConfig, fetchFn: typeof fetch = fetch) {
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new Error('Cloudinary credentials (cloudName, apiKey, apiSecret) are required.');
    }
    this.cloudName = config.cloudName;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.folder = config.folder;
    this.fetchFn = fetchFn;
  }

  private resolveResourceType(mimeType: string): 'image' | 'raw' {
    if (mimeType.startsWith('image/')) return 'image';
    return 'raw';
  }

  private buildFullPublicId(storageKey: string): string {
    const cleanKey = storageKey.replace(/\.\./g, '');
    return this.folder ? `${this.folder}/${cleanKey}` : cleanKey;
  }

  async put(storageKey: string, data: Uint8Array, mimeType: string): Promise<void> {
    const resourceType = this.resolveResourceType(mimeType);
    const fullPublicId = this.buildFullPublicId(storageKey);
    const timestamp = Math.floor(Date.now() / 1000);

    const signParams: Record<string, string | number> = {
      overwrite: 'true',
      public_id: fullPublicId,
      timestamp,
    };

    const signature = generateCloudinarySignature(signParams, this.apiSecret);

    const formData = new FormData();
    const blob = new Blob([data], { type: mimeType });
    formData.append('file', blob, storageKey.split('/').pop() || 'asset');
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('public_id', fullPublicId);
    formData.append('overwrite', 'true');
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;
    const response = await this.fetchFn(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Cloudinary upload failed with status ${response.status}: ${errText}`);
    }

    const payload = (await response.json().catch(() => ({}))) as { secure_url?: string };
    if (payload?.secure_url) {
      this.urlCache.set(storageKey, { secureUrl: payload.secure_url, mimeType });
    }
  }

  async get(storageKey: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    const cached = this.urlCache.get(storageKey);
    if (cached) {
      try {
        const res = await this.fetchFn(cached.secureUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          return { data: new Uint8Array(buf), mimeType: cached.mimeType };
        }
      } catch {
        // Fallback to direct resolution
      }
    }

    const fullPublicId = this.buildFullPublicId(storageKey);
    const candidates = [
      {
        url: `https://res.cloudinary.com/${this.cloudName}/image/upload/${fullPublicId}`,
        mimeType: 'image/jpeg',
      },
      {
        url: `https://res.cloudinary.com/${this.cloudName}/raw/upload/${fullPublicId}`,
        mimeType: 'application/pdf',
      },
    ];

    for (const candidate of candidates) {
      try {
        const res = await this.fetchFn(candidate.url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const detectedMime = res.headers.get('content-type') || candidate.mimeType;
          return { data: new Uint8Array(buf), mimeType: detectedMime };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async delete(storageKey: string): Promise<boolean> {
    const fullPublicId = this.buildFullPublicId(storageKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceTypes: Array<'image' | 'raw'> = ['image', 'raw'];

    for (const resourceType of resourceTypes) {
      const signParams: Record<string, string | number> = {
        public_id: fullPublicId,
        timestamp,
      };
      const signature = generateCloudinarySignature(signParams, this.apiSecret);

      const formData = new FormData();
      formData.append('public_id', fullPublicId);
      formData.append('timestamp', String(timestamp));
      formData.append('api_key', this.apiKey);
      formData.append('signature', signature);

      const destroyUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/destroy`;
      try {
        const res = await this.fetchFn(destroyUrl, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const result = (await res.json().catch(() => ({}))) as { result?: string };
          if (result.result === 'ok') {
            this.urlCache.delete(storageKey);
            return true;
          }
        }
      } catch {
        // Try other resource type
      }
    }

    this.urlCache.delete(storageKey);
    return false;
  }
}
