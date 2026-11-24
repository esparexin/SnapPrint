'use client';

import React, { useRef, useState } from 'react';
import { AllowedMimeTypes } from '@snapprint/contracts';

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
    <div style={{ marginBottom: '16px' }}>
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
        style={{
          border: `1.5px dashed ${isDragging ? '#0284c7' : '#94a3b8'}`,
          borderRadius: '10px',
          padding: '16px 12px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f9ff' : '#ffffff',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '4px' }}>📄</div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
          Upload Documents or Photos
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 12px', lineHeight: 1.4 }}>
          Supports PDF (Multi-page), JPG, PNG, WebP up to 50MB.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              padding: '8px 18px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
            }}
          >
            📂 Browse Files & Photos
          </button>
        </div>
      </div>
    </div>
  );
}
