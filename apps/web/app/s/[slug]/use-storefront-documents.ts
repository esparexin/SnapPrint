'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AllowedMimeType, DocumentPrintConfig } from '@snapprint/contracts';
import { deleteSessionPhoto, listSessionPhotos } from '../../../src/upload-client';
import * as docHelpers from './document-print-workflow-helpers';
import { UploadItem } from './photo-item-card';

export function useStorefrontDocuments(slug: string, sessionId: string, token: string) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [configs, setConfigs] = useState<DocumentPrintConfig[]>([]);
  const [removingKeys, setRemovingKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<docHelpers.WorkflowFeedback | null>(null);
  const removingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    listSessionPhotos(slug, sessionId, token)
      .then((assets) => {
        if (mounted) setItems(docHelpers.mapAssetsToUploadItems(assets, slug, sessionId, token));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [slug, sessionId, token]);

  const docs = useMemo(() => docHelpers.toCompletedDocs(items), [items]);
  const activeConfigs = useMemo(
    () => docHelpers.reconcileDocumentConfigs(docs, configs),
    [docs, configs]
  );

  const uploadFile = useCallback(
    async (item: UploadItem, mimeType?: AllowedMimeType) => {
      const resolvedMime =
        mimeType ?? docHelpers.inferUploadMimeType(item.file) ?? 'application/pdf';
      const abort = new AbortController();
      const patch = (p: Partial<UploadItem>) =>
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...p } : i)));

      patch({ status: 'uploading', abortController: abort, error: undefined });
      try {
        const asset = await docHelpers.uploadSingleAsset(
          slug,
          sessionId,
          token,
          item.file,
          resolvedMime,
          abort.signal
        );
        patch({
          status: 'completed',
          assetId: asset.assetId,
          widthPx: asset.widthPx,
          heightPx: asset.heightPx,
          pageCount: asset.pageCount || 1,
          abortController: undefined,
        });
        setFeedback({ kind: 'success', message: `Uploaded "${item.file.name}" successfully.` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        patch({ status: 'failed', error: msg, abortController: undefined });
        if ((err as { code?: string } | null)?.code !== 'UPLOAD_ABORTED') {
          setFeedback({ kind: 'error', message: `Failed to upload "${item.file.name}": ${msg}` });
        }
      }
    },
    [slug, sessionId, token]
  );

  function handleFilesSelected(files: File[]) {
    setFeedback(null);
    const { queued, error } = docHelpers.validateAndQueueFiles(files, items.length);
    if (error) setFeedback({ kind: 'error', message: error });
    if (queued.length > 0) {
      setItems((prev) => [...prev, ...queued.map((q) => q.item)]);
      queued.forEach(({ item, mimeType }) => uploadFile(item, mimeType));
    }
  }

  function handleCancelUpload(id: string) {
    const item = items.find((i) => i.id === id);
    if (item?.abortController) item.abortController.abort();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'failed', error: 'Upload cancelled' } : i))
    );
  }

  function handleRetryUpload(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) uploadFile(item);
  }

  async function removeDocument(key: string, byAssetId: boolean) {
    const item = items.find((i) => (byAssetId ? i.assetId === key : i.id === key));
    if (!item) return;
    const lockKey = item.assetId || item.id;
    if (removingRef.current.has(lockKey)) return;
    removingRef.current.add(lockKey);
    setRemovingKeys((prev) => [...prev, lockKey]);
    setFeedback(null);
    try {
      if (item.assetId) {
        await deleteSessionPhoto(slug, sessionId, item.assetId, token);
        setFeedback({ kind: 'success', message: `Deleted "${item.file.name}" successfully.` });
      }
      docHelpers.revokePreviewUrlIfBlob(item.previewUrl);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (item.assetId) setConfigs((prev) => prev.filter((c) => c.assetId !== item.assetId));
    } catch (err) {
      const fallback = `Failed to delete "${item.file.name}". Please try again.`;
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : fallback });
    } finally {
      removingRef.current.delete(lockKey);
      setRemovingKeys((prev) => prev.filter((k) => k !== lockKey));
    }
  }
  function handleUpdateConfig(assetId: string, updated: DocumentPrintConfig) {
    setConfigs((prev) =>
      docHelpers
        .reconcileDocumentConfigs(docs, prev)
        .map((c) => (c.assetId === assetId ? updated : c))
    );
  }
  function resetDocuments() {
    items.forEach((i) => docHelpers.revokePreviewUrlIfBlob(i.previewUrl));
    setItems([]);
    setConfigs([]);
    setFeedback(null);
  }

  return {
    items,
    docs,
    activeConfigs,
    removingKeys,
    feedback,
    setFeedback,
    handleFilesSelected,
    handleCancelUpload,
    handleRetryUpload,
    handleDeleteItem: (id: string) => removeDocument(id, false),
    handleRemoveAsset: (assetId: string) => removeDocument(assetId, true),
    handleUpdateConfig,
    resetDocuments,
  };
}
