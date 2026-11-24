'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchStudioDevices,
  fetchStudioPrinters,
  getAgentDownloadUrl,
} from '../../src/printer-client';

interface OfflineHardwareAlertBannerProps {
  studioId: string;
  onOpenPairing: () => void;
}

export function OfflineHardwareAlertBanner({
  studioId,
  onOpenPairing,
}: OfflineHardwareAlertBannerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string>('');
  const downloadUrl = getAgentDownloadUrl();

  useEffect(() => {
    let mounted = true;

    async function checkFleetReadiness() {
      try {
        const [devicesRes, printersRes] = await Promise.all([
          fetchStudioDevices(studioId),
          fetchStudioPrinters(studioId),
        ]);

        if (!mounted) return;

        const hasOnlineAgent = devicesRes.devices.some((d) => d.isOnline);
        const hasActivePrinter = printersRes.printers.some(
          (p) => p.role === 'active_bw' || p.role === 'active_color'
        );

        if (!hasOnlineAgent) {
          setIsOffline(true);
          setOfflineReason(
            'Printing is currently offline. Customers cannot place orders until a Windows Print Agent is running.'
          );
        } else if (!hasActivePrinter) {
          setIsOffline(true);
          setOfflineReason(
            'Printing is currently offline. Customers cannot place orders until an active printer (B&W or Color) is assigned.'
          );
        } else {
          setIsOffline(false);
          setOfflineReason('');
        }
      } catch {
        // If checking fails, do not block the UI with an alarmist banner
        if (mounted) setIsOffline(false);
      }
    }

    checkFleetReadiness();
    return () => {
      mounted = false;
    };
  }, [studioId]);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      style={{
        margin: '16px 0',
        padding: '14px 16px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        color: '#92400e',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
        <div>
          <strong style={{ fontSize: '0.875rem', color: '#78350f' }}>
            Printing is Currently Offline
          </strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#92400e' }}>
            {offlineReason}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={downloadUrl}
          download="SnapPrint-Print-Agent.msi"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            minHeight: '44px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        >
          📥 Download Agent (.msi)
        </a>
        <button
          type="button"
          onClick={onOpenPairing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 14px',
            minHeight: '44px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          + Pair PC Agent
        </button>
      </div>
    </div>
  );
}
