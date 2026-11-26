'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOperatorDocumentBlob, OrderApiError } from '../../src/order-client';

export function mapPreviewError(err: unknown): string {
  if (err instanceof OrderApiError) {
    if (err.statusCode === 403 || err.code === 'PAYMENT_REQUIRED_BEFORE_PRINT') {
      return 'Payment is required before previewing or downloading order documents.';
    }
    if (err.statusCode === 410 || err.code === 'DOCUMENT_DELETED') {
      return 'Document preview is unavailable because this file was permanently deleted.';
    }
    if (err.statusCode === 404) {
      return 'Document binary was not found in private storage or order does not exist.';
    }
    return err.message || 'Failed to load document preview.';
  }
  return err instanceof Error ? err.message : 'Failed to connect to preview service.';
}

export function useOrderDocumentPreview(
  studioId: string,
  orderId: string,
  assetId: string,
  disabled: boolean
) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(!disabled);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (disabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOperatorDocumentBlob(studioId, orderId, assetId);
      const url = URL.createObjectURL(res.blob);
      setBlobUrl((prev) => (prev && URL.revokeObjectURL(prev), url));
      setMimeType(res.mimeType);
    } catch (err) {
      setError(mapPreviewError(err));
    } finally {
      setLoading(false);
    }
  }, [studioId, orderId, assetId, disabled]);

  useEffect(() => {
    loadPreview();
    return () => {
      setBlobUrl((prev) => (prev && URL.revokeObjectURL(prev), null));
    };
  }, [loadPreview]);

  return { blobUrl, mimeType, loading, error, loadPreview };
}
