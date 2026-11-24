'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPermanentStudioUrl } from '@snapprint/domain';
import { fetchStudio } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { StudioQrActions } from './studio-qr-actions';
import { StudioQrPreviewBox } from './studio-qr-preview-box';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://snapprint.in';

interface StudioQrModalProps {
  studio: {
    id: string;
    slug?: string;
    name?: string;
  };
  onClose: () => void;
}

export function StudioQrModal({ studio, onClose }: StudioQrModalProps) {
  const [resolvedSlug, setResolvedSlug] = useState<string>(studio.slug || '');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (studio.slug) {
      setResolvedSlug(studio.slug);
    } else if (studio.id) {
      fetchStudio(studio.id)
        .then((res) => mounted && res?.studio?.slug && setResolvedSlug(res.studio.slug))
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [studio.id, studio.slug]);

  const canonicalUrl = resolvedSlug ? buildPermanentStudioUrl(BASE_URL, resolvedSlug) : '';

  useEffect(() => {
    let mounted = true;
    async function generateCodes() {
      if (!canonicalUrl) return;
      try {
        const color = { dark: '#0f172a', light: '#ffffff' };
        const [svg, png] = await Promise.all([
          QRCode.toString(canonicalUrl, { type: 'svg', margin: 2, color }),
          QRCode.toDataURL(canonicalUrl, { width: 1024, margin: 2, color }),
        ]);
        if (mounted) {
          setSvgMarkup(svg);
          setPngDataUrl(png);
        }
      } catch {
        /* ignore */
      }
    }
    generateCodes();
    return () => {
      mounted = false;
    };
  }, [canonicalUrl]);

  function handleCopy() {
    if (!canonicalUrl) return;
    navigator.clipboard
      ?.writeText(canonicalUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  function download(content: string, ext: 'svg' | 'png') {
    if (!content || !resolvedSlug) return;
    const isSvg = ext === 'svg';
    const href = isSvg
      ? URL.createObjectURL(new Blob([content], { type: 'image/svg+xml' }))
      : content;
    const a = Object.assign(document.createElement('a'), {
      href,
      download: `${resolvedSlug}-counter-qr.${ext}`,
    });
    a.click();
    if (isSvg) URL.revokeObjectURL(href);
  }

  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: true,
    onClose,
    enableSwipeDown: true,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-qr-title"
      className="dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        className="dialog-content"
        style={{ maxWidth: '480px', padding: '24px' }}
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
          <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
          Print this QR code on physical acrylic counter stands, posters, or stickers. It
          permanently encodes your studio URL and never expires.
        </p>

        <StudioQrPreviewBox svgMarkup={svgMarkup} canonicalUrl={canonicalUrl} />

        <StudioQrActions
          copied={copied}
          hasSvg={Boolean(svgMarkup)}
          hasPng={Boolean(pngDataUrl)}
          onCopy={handleCopy}
          onDownloadSvg={() => download(svgMarkup, 'svg')}
          onDownloadPng={() => download(pngDataUrl, 'png')}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  );
}
