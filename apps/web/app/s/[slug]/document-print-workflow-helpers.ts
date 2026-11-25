import type { CSSProperties } from 'react';
import {
  AllowedMimeType,
  AllowedMimeTypes,
  DocumentPrintConfig,
  PhotoAsset,
  UploadLimits,
} from '@snapprint/contracts';
import {
  getPhotoPreviewUrl,
  requestUploadIntent,
  uploadPhotoBinary,
} from '../../../src/upload-client';
import { UploadItem } from './photo-item-card';

export interface UploadedDocInfo {
  assetId: string;
  filename: string;
  pageCount: number;
}

export interface WorkflowFeedback {
  kind: 'success' | 'error';
  message: string;
}

const EXTENSION_MIME_MAP: Record<string, AllowedMimeType> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

export const createDefaultConfig = (assetId: string): DocumentPrintConfig => ({
  assetId,
  paperSize: 'A4',
  colorMode: 'black_and_white',
  sides: 'single_sided',
  orientation: 'portrait',
  scaling: 'fit_to_page',
  pageSelection: 'all',
  copies: 1,
});

export function inferUploadMimeType(file: { name: string; type?: string }): AllowedMimeType | null {
  if (file.type) {
    return AllowedMimeTypes.includes(file.type as AllowedMimeType)
      ? (file.type as AllowedMimeType)
      : null;
  }
  const lower = file.name.toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  const ext = dotIdx >= 0 ? lower.slice(dotIdx) : '';
  return EXTENSION_MIME_MAP[ext] ?? null;
}

export function mapAssetsToUploadItems(
  assets: PhotoAsset[],
  slug: string,
  sessionId: string,
  token: string
): UploadItem[] {
  return assets.map((a) => ({
    id: a.assetId,
    file: new File([], a.originalFilename, { type: a.mimeType }),
    previewUrl: getPhotoPreviewUrl(slug, sessionId, a.assetId, token),
    status: 'completed',
    assetId: a.assetId,
    widthPx: a.widthPx,
    heightPx: a.heightPx,
    pageCount: a.pageCount || 1,
  }));
}

export function toCompletedDocs(items: UploadItem[]): UploadedDocInfo[] {
  return items
    .filter((i) => i.status === 'completed' && Boolean(i.assetId))
    .map((i) => ({
      assetId: i.assetId!,
      filename: i.file.name,
      pageCount: i.pageCount || 1,
    }));
}

export function reconcileDocumentConfigs(
  docs: UploadedDocInfo[],
  prevConfigs: DocumentPrintConfig[]
): DocumentPrintConfig[] {
  return docs.map(
    (doc) =>
      prevConfigs.find((cfg) => cfg.assetId === doc.assetId) || createDefaultConfig(doc.assetId)
  );
}

export function resolvePreviewTarget(
  docs: UploadedDocInfo[],
  configs: DocumentPrintConfig[],
  assetId: string | null
): { doc: UploadedDocInfo; config: DocumentPrintConfig } | null {
  if (!assetId) return null;
  const doc = docs.find((d) => d.assetId === assetId);
  if (!doc) return null;
  const config = configs.find((c) => c.assetId === assetId) || createDefaultConfig(assetId);
  return { doc, config };
}

export function hasInvalidPageSelection(configs: DocumentPrintConfig[]): boolean {
  return configs.some((c) => !c.pageSelection.trim());
}

export function validateAndQueueFiles(
  files: File[],
  existingCount: number,
  createPreviewUrl: (file: File) => string = (f) => URL.createObjectURL(f)
): {
  queued: Array<{ item: UploadItem; mimeType: AllowedMimeType }>;
  error: string | null;
} {
  const queued: Array<{ item: UploadItem; mimeType: AllowedMimeType }> = [];
  let error: string | null = null;

  for (const file of files) {
    if (existingCount + queued.length >= UploadLimits.maxFilesPerSession) {
      error = `Session limit reached: Maximum ${UploadLimits.maxFilesPerSession} files per session.`;
      break;
    }
    if (file.size > UploadLimits.maxFileSize) {
      error = `"${file.name}" exceeds the 50MB file size limit.`;
      continue;
    }
    const mimeType = inferUploadMimeType(file);
    if (!mimeType) {
      error = `"${file.name}" is not a supported document format (PDF, JPG, PNG, WebP).`;
      continue;
    }
    queued.push({
      mimeType,
      item: {
        id: `upload_${Math.random().toString(36).substring(2)}_${Date.now()}`,
        file,
        previewUrl: createPreviewUrl(file),
        status: 'pending',
      },
    });
  }

  return { queued, error };
}

export async function uploadSingleAsset(
  slug: string,
  sessionId: string,
  token: string,
  file: File,
  mimeType: AllowedMimeType,
  signal: AbortSignal
): Promise<PhotoAsset> {
  const intent = await requestUploadIntent(
    slug,
    sessionId,
    { filename: file.name, fileSizeBytes: file.size, mimeType },
    token
  );
  return uploadPhotoBinary(intent.uploadUrl, file, token, signal);
}

export function revokePreviewUrlIfBlob(url: string): void {
  if (
    url.startsWith('blob:') &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(url);
  }
}

export function getFeedbackBannerStyle(kind: WorkflowFeedback['kind']): CSSProperties {
  const isSuccess = kind === 'success';
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
    border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
    borderRadius: '8px',
    color: isSuccess ? '#166534' : '#b91c1c',
    fontSize: '13px',
    marginBottom: '14px',
    fontWeight: 500,
  };
}
