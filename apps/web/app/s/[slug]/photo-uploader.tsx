'use client';

import React from 'react';
import { UploadLimits } from '@snapprint/contracts';
import {
  getFeedbackBannerStyle,
  UploadedDocInfo,
  WorkflowFeedback,
} from './document-print-workflow-helpers';
import { PhotoDropzone } from './photo-dropzone';
import { PhotoItemCard, UploadItem } from './photo-item-card';

export type { UploadedDocInfo };

interface PhotoUploaderProps {
  items: UploadItem[];
  feedback?: WorkflowFeedback | null;
  onDismissFeedback?: () => void;
  onFilesSelected: (files: File[]) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PhotoUploader({
  items,
  feedback,
  onDismissFeedback,
  onFilesSelected,
  onRetry,
  onCancel,
  onDelete,
}: PhotoUploaderProps) {
  const pendingItems = items.filter((i) => i.status !== 'completed');

  return (
    <div>
      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          style={getFeedbackBannerStyle(feedback.kind)}
        >
          <span>{feedback.message}</span>
          {onDismissFeedback && (
            <button
              type="button"
              onClick={onDismissFeedback}
              aria-label="Dismiss status message"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 700,
                minWidth: '24px',
                minHeight: '24px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}
      <PhotoDropzone
        onFilesSelected={onFilesSelected}
        disabled={items.length >= UploadLimits.maxFilesPerSession}
      />
      {pendingItems.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {pendingItems.map((item) => (
            <PhotoItemCard
              key={item.id}
              item={item}
              onRetry={onRetry}
              onCancel={onCancel}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
