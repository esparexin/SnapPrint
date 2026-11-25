'use client';

import React, { useRef, useState } from 'react';
import { AllowedMimeTypes } from '@snapprint/contracts';
import { UploadCloudIcon } from './storefront-icons';

interface PhotoDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function PhotoDropzone({ onFilesSelected, disabled }: PhotoDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={AllowedMimeTypes.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={isDragging ? 'sf-dropzone sf-dropzone--dragging' : 'sf-dropzone'}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#f0f9ff',
            color: '#0284c7',
            marginBottom: '6px',
          }}
          aria-hidden="true"
        >
          <UploadCloudIcon size={17} />
        </div>
        <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a', lineHeight: 1.3 }}>
          Upload Documents or Photos
        </div>
        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 10px', lineHeight: 1.35 }}>
          Supports PDF (Multi-page), JPG, PNG, WebP up to 50MB.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="sf-upload-btn"
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <UploadCloudIcon size={15} />
            Browse Files &amp; Photos
          </button>
        </div>
      </div>
    </div>
  );
}
