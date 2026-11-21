import {
  AllowedMimeType,
  PhotoAsset,
  PhotoAssetListResponseSchema,
  PhotoAssetSchema,
  UploadIntentResponse,
  UploadIntentResponseSchema,
} from '@snapprint/contracts';
import { getApiBaseUrl } from './auth-client.js';
import { CustomerApiError } from './customer-client.js';

export function getPhotoPreviewUrl(slug: string, sessionId: string, assetId: string): string {
  const base = getApiBaseUrl();
  return `${base}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/assets/${encodeURIComponent(assetId)}/preview`;
}

export async function requestUploadIntent(
  slug: string,
  sessionId: string,
  fileMeta: { filename: string; fileSizeBytes: number; mimeType: AllowedMimeType },
  token: string,
  customFetch: typeof fetch = fetch
): Promise<UploadIntentResponse> {
  const base = getApiBaseUrl();
  let res: Response;

  try {
    res = await customFetch(
      `${base}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/assets/intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fileMeta),
      }
    );
  } catch {
    throw new CustomerApiError('Failed to connect to upload intent service', 0, 'NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CustomerApiError(
      payload?.message || 'Upload intent authorization failed',
      res.status,
      payload?.code || 'INTENT_FAILED'
    );
  }

  return UploadIntentResponseSchema.parse(payload);
}

export async function uploadPhotoBinary(
  uploadUrl: string,
  file: File,
  token: string,
  abortSignal?: AbortSignal,
  customFetch: typeof fetch = fetch
): Promise<PhotoAsset> {
  const base = getApiBaseUrl();
  const targetUrl = uploadUrl.startsWith('http') ? uploadUrl : `${base}${uploadUrl}`;

  const formData = new FormData();
  formData.append('file', file, file.name);

  let res: Response;
  try {
    res = await customFetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: abortSignal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new CustomerApiError('Upload cancelled by user', 0, 'UPLOAD_ABORTED');
    }
    throw new CustomerApiError('Network error during file upload', 0, 'UPLOAD_NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CustomerApiError(
      payload?.message || 'Server rejected file upload',
      res.status,
      payload?.code || 'UPLOAD_FAILED'
    );
  }

  return PhotoAssetSchema.parse(payload);
}

export async function listSessionPhotos(
  slug: string,
  sessionId: string,
  token: string,
  customFetch: typeof fetch = fetch
): Promise<PhotoAsset[]> {
  const base = getApiBaseUrl();
  let res: Response;

  try {
    res = await customFetch(
      `${base}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/assets`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new CustomerApiError('Unable to fetch session photos', 0, 'NETWORK_ERROR');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new CustomerApiError(
      payload?.message || 'Failed to list session photos',
      res.status,
      payload?.code || 'FETCH_FAILED'
    );
  }

  return PhotoAssetListResponseSchema.parse(payload).assets;
}

export async function deleteSessionPhoto(
  slug: string,
  sessionId: string,
  assetId: string,
  token: string,
  customFetch: typeof fetch = fetch
): Promise<void> {
  const base = getApiBaseUrl();
  let res: Response;

  try {
    res = await customFetch(
      `${base}/public/studios/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/assets/${encodeURIComponent(assetId)}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new CustomerApiError('Unable to connect to asset delete service', 0, 'NETWORK_ERROR');
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new CustomerApiError(
      payload?.message || 'Failed to delete photo asset',
      res.status,
      payload?.code || 'DELETE_FAILED'
    );
  }
}
