'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPermanentStudioUrl } from '@snapprint/domain';
import { useDialog } from '../hooks/use-dialog';
import { StudioQrActions } from './studio-qr-actions';

interface StudioQrModalProps {
  studio: {
    id: string;
    slug: string;
    name: string;
  };
  onClose: () => void;
}

export function StudioQrModal({ studio, onClose }: StudioQrModalProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://snapprint.in';

  const canonicalUrl = buildPermanentStudioUrl(baseUrl, studio.slug);

  useEffect(() => {
    let mounted = true;

    async function generateCodes() {
      try {
        const svg = await QRCode.toString(canonicalUrl, {
          type: 'svg',
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });

        const png = await QRCode.toDataURL(canonicalUrl, {
          width: 1024,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });

        if (mounted) {
          setSvgMarkup(svg);
          setPngDataUrl(png);
        }
      } catch {
        // Fallback handled
      }
    }

    generateCodes();

    return () => {
      mounted = false;
    };
  }, [canonicalUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleDownloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${studio.slug}-counter-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadPng() {
    if (!pngDataUrl) return;
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = `${studio.slug}-counter-qr.png`;
    a.click();
  }

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="studio-qr-title" className="dialog-overlay" onClick={handleBackdropClick}>
      <div
        className="dialog-content"
        style={{
          maxWidth: '480px',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...swipeHandlers} className="dialog-drag-handle" aria-hidden="true" />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 id="studio-qr-title" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Permanent Counter QR Code
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="dialog-close-btn"
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
          Print this QR code on physical acrylic counter stands, posters, or stickers. It
          permanently encodes your studio URL and never expires.
        </p>

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

        <StudioQrActions
          copied={copied}
          hasSvg={Boolean(svgMarkup)}
          hasPng={Boolean(pngDataUrl)}
          onCopy={handleCopy}
          onDownloadSvg={handleDownloadSvg}
          onDownloadPng={handleDownloadPng}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  );
}
