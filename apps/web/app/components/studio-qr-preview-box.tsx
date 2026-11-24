'use client';

import React from 'react';

interface StudioQrPreviewBoxProps {
  svgMarkup: string;
  canonicalUrl: string;
}

export function StudioQrPreviewBox({ svgMarkup, canonicalUrl }: StudioQrPreviewBoxProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        {svgMarkup ? (
          <div
            style={{ width: '220px', height: '220px' }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        ) : (
          <div
            style={{
              width: '220px',
              height: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            Generating QR...
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: '16px',
          padding: '10px 12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontSize: '12px',
        }}
      >
        <div style={{ color: '#64748b', marginBottom: '4px' }}>Permanent URL:</div>
        <div style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
          {canonicalUrl}
        </div>
      </div>
    </>
  );
}
