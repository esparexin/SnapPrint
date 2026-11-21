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
    <div style={{ marginBottom: '24px' }}>
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
          border: `2px dashed ${isDragging ? '#0284c7' : '#cbd5e1'}`,
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f9ff' : '#ffffff',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
          Upload Documents for Xerox & Printing
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 16px', lineHeight: 1.5 }}>
          Drag & drop PDF documents or photos here, or use the button below.
          <br />
          Supports PDF (Multi-page), JPG, PNG, WebP up to 50MB.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📂 Browse Documents & Files
          </button>
        </div>
      </div>
    </div>
  );
}
