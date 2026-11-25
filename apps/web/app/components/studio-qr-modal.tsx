'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPermanentStudioUrl } from '@snapprint/domain';
import { fetchStudio } from '../../src/workspace-client';
import { useDialog } from '../hooks/use-dialog';
import { StudioQrActions } from './studio-qr-actions';
import { StudioQrPreviewBox } from './studio-qr-preview-box';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://snap.palnadu.dev');

interface StudioQrModalProps {
  studio: { id: string; slug?: string; name?: string };
  onClose: () => void;
  inShell?: boolean;
}

export function StudioQrModal({ studio, onClose, inShell = false }: StudioQrModalProps) {
  const [resolvedSlug, setResolvedSlug] = useState<string>(studio.slug || '');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { handleBackdropClick, swipeHandlers } = useDialog({
    isOpen: !inShell,
    onClose,
    enableSwipeDown: true,
  });

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
    if (!canonicalUrl) return;
    let mounted = true;
    const color = { dark: '#0f172a', light: '#ffffff' };
    Promise.all([
      QRCode.toString(canonicalUrl, { type: 'svg', margin: 2, color }),
      QRCode.toDataURL(canonicalUrl, { width: 1024, margin: 2, color }),
    ])
      .then(([svg, png]) => {
        if (mounted) {
          setSvgMarkup(svg);
          setPngDataUrl(png);
        }
      })
      .catch(() => {});
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

  const content = (
    <>
      <div className="portal-section-header">
        <h2 id="studio-qr-title" className="portal-section-title">
          Permanent Counter QR Code
        </h2>
        {!inShell && (
          <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
            ✕
          </button>
        )}
      </div>
      <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
        Print this QR code on physical acrylic counter stands, posters, or stickers. It permanently
        encodes your studio URL and never expires.
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
    </>
  );

  if (inShell)
    return (
      <div className="portal-section-card" style={{ padding: 20 }}>
        {content}
      </div>
    );

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
        {content}
      </div>
    </div>
  );
}
