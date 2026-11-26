'use client';

import React from 'react';

export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  assetId?: string;
  widthPx?: number;
  heightPx?: number;
  pageCount?: number;
  abortController?: AbortController;
}

interface PhotoItemCardProps {
  item: UploadItem;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  gap: '12px',
  marginBottom: '10px',
  minWidth: 0,
  maxWidth: '100%',
};

const pdfIconStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '6px',
  backgroundColor: '#e0f2fe',
  color: '#0284c7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  flexShrink: 0,
};

const thumbStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  objectFit: 'cover',
  borderRadius: '6px',
  backgroundColor: '#f1f5f9',
  flexShrink: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const fileNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '14px',
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: '#e2e8f0',
  borderRadius: '2px',
  overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
  width: '60%',
  height: '100%',
  backgroundColor: '#0284c7',
  animation: 'pulse 1.5s infinite',
};

const errorBoxStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#dc2626',
  marginTop: '4px',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
};

const retryBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#dc2626',
  fontWeight: 600,
  cursor: 'pointer',
};

export function PhotoItemCard({ item, onRetry, onCancel, onDelete }: PhotoItemCardProps) {
  const sizeMb = (item.file.size / (1024 * 1024)).toFixed(2);
  const isPdf =
    item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');

  return (
    <div style={cardStyle}>
      {isPdf ? (
        <div style={pdfIconStyle}>📄</div>
      ) : (
        <img src={item.previewUrl} alt={item.file.name} style={thumbStyle} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div title={item.file.name} style={fileNameStyle}>
          {item.file.name}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {sizeMb} MB
          {item.pageCount && ` · ${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`}
        </div>

        {item.status === 'uploading' && (
          <div style={{ marginTop: '6px' }}>
            <div style={progressTrackStyle}>
              <div style={progressBarFillStyle} />
            </div>
            <span
              style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', display: 'block' }}
            >
              Uploading to private storage...
            </span>
          </div>
        )}

        {item.status === 'failed' && (
          <div style={errorBoxStyle}>⚠️ {item.error || 'Upload failed'}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {item.status === 'uploading' && (
          <button type="button" onClick={() => onCancel(item.id)} style={cancelBtnStyle}>
            Cancel
          </button>
        )}

        {item.status === 'failed' && (
          <button type="button" onClick={() => onRetry(item.id)} style={retryBtnStyle}>
            Retry
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          style={{
            padding: '6px 10px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
