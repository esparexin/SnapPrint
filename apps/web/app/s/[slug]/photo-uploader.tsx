'use client';

import React, { useEffect, useState } from 'react';
import { AllowedMimeType, AllowedMimeTypes, UploadLimits } from '@snapprint/contracts';
import {
  deleteSessionPhoto,
  getPhotoPreviewUrl,
  listSessionPhotos,
  requestUploadIntent,
  uploadPhotoBinary,
} from '../../../src/upload-client';
import { PhotoDropzone } from './photo-dropzone';
import { PhotoItemCard, UploadItem } from './photo-item-card';

export interface UploadedDocInfo {
  assetId: string;
  filename: string;
  pageCount: number;
}

interface PhotoUploaderProps {
  slug: string;
  sessionId: string;
  token: string;
  onDocumentsChange?: (docs: UploadedDocInfo[]) => void;
}

export function PhotoUploader({ slug, sessionId, token, onDocumentsChange }: PhotoUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadExisting() {
      try {
        const assets = await listSessionPhotos(slug, sessionId, token);
        if (!mounted) return;
        const mapped: UploadItem[] = assets.map((a) => ({
          id: a.assetId,
          file: new File([], a.originalFilename, { type: a.mimeType }),
          previewUrl: getPhotoPreviewUrl(slug, sessionId, a.assetId, token),
          status: 'completed',
          assetId: a.assetId,
          widthPx: a.widthPx,
          heightPx: a.heightPx,
          pageCount: a.pageCount || 1,
        }));
        setItems(mapped);
      } catch {
        // Fallback silently if offline
      }
    }
    loadExisting();
    return () => {
      mounted = false;
    };
  }, [slug, sessionId, token]);

  useEffect(() => {
    if (!onDocumentsChange) return;
    const completedDocs: UploadedDocInfo[] = items
      .filter((i) => i.status === 'completed' && Boolean(i.assetId))
      .map((i) => ({
        assetId: i.assetId!,
        filename: i.file.name,
        pageCount: i.pageCount || 1,
      }));
    onDocumentsChange(completedDocs);
  }, [items, onDocumentsChange]);

  async function uploadFile(item: UploadItem) {
    const abort = new AbortController();
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, status: 'uploading', abortController: abort, error: undefined }
          : i
      )
    );

    try {
      const intent = await requestUploadIntent(
        slug,
        sessionId,
        {
          filename: item.file.name,
          fileSizeBytes: item.file.size,
          mimeType: (item.file.type || 'application/pdf') as AllowedMimeType,
        },
        token
      );

      const asset = await uploadPhotoBinary(intent.uploadUrl, item.file, token, abort.signal);

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'completed',
                assetId: asset.assetId,
                widthPx: asset.widthPx,
                heightPx: asset.heightPx,
                pageCount: asset.pageCount || 1,
                abortController: undefined,
              }
            : i
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'failed', error: msg, abortController: undefined } : i
        )
      );
    }
  }

  function handleFilesSelected(files: File[]) {
    setErrorBanner(null);
    const newItems: UploadItem[] = [];

    for (const file of files) {
      if (items.length + newItems.length >= UploadLimits.maxFilesPerSession) {
        setErrorBanner(
          `Session limit reached: Maximum ${UploadLimits.maxFilesPerSession} files per session.`
        );
        break;
      }

      if (file.size > UploadLimits.maxFileSize) {
        setErrorBanner(`"${file.name}" exceeds the 50MB file size limit.`);
        continue;
      }

      if (file.type && !AllowedMimeTypes.includes(file.type as AllowedMimeType)) {
        setErrorBanner(`"${file.name}" is not a supported document format (PDF, JPG, PNG, WebP).`);
        continue;
      }

      const item: UploadItem = {
        id: `upload_${Math.random().toString(36).substring(2)}_${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      };
      newItems.push(item);
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      for (const item of newItems) {
        uploadFile(item);
      }
    }
  }

  function handleCancel(id: string) {
    const item = items.find((i) => i.id === id);
    if (item?.abortController) item.abortController.abort();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'failed', error: 'Upload cancelled' } : i))
    );
  }

  function handleRetry(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) uploadFile(item);
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (item.assetId) {
      try {
        await deleteSessionPhoto(slug, sessionId, item.assetId, token);
      } catch {
        // Fallback
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      {errorBanner && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          {errorBanner}
        </div>
      )}

      <PhotoDropzone
        onFilesSelected={handleFilesSelected}
        disabled={items.length >= UploadLimits.maxFilesPerSession}
      />
      {items.length > 0 && (
        <div>
          {items.map((item) => (
            <PhotoItemCard
              key={item.id}
              item={item}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
