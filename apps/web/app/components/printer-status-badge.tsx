'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fetchStudioFleetStatus, ShopPrinterStatus } from '../../src/printer-client';
import { PrinterTroubleshootingPopover } from './printer-troubleshooting-popover';

export interface PrinterStatusBadgeProps {
  studioId: string;
  initialStatus?: ShopPrinterStatus;
}

const STATUS_CONFIG: Record<
  ShopPrinterStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  not_added: {
    label: 'Printer Not Added',
    dotClass: 'portal-status-dot-neutral',
    badgeClass: 'portal-status-badge-neutral',
  },
  connected: {
    label: 'Connected',
    dotClass: 'portal-status-dot-success',
    badgeClass: 'portal-status-badge-success',
  },
  offline: {
    label: 'Offline',
    dotClass: 'portal-status-dot-danger',
    badgeClass: 'portal-status-badge-danger',
  },
};

export function PrinterStatusBadge({ studioId, initialStatus }: PrinterStatusBadgeProps) {
  const [status, setStatus] = useState<ShopPrinterStatus>(initialStatus || 'offline');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    const updateFleet = () => {
      fetchStudioFleetStatus(studioId)
        .then((res) => {
          if (mounted) setStatus(res.status);
        })
        .catch(() => {});
    };
    updateFleet();
    const interval = setInterval(updateFleet, 20_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [studioId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimer();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearTimer();
    timerRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const config = STATUS_CONFIG[status];

  return (
    <div
      ref={containerRef}
      className="portal-printer-status-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`portal-printer-status-badge ${config.badgeClass}`}>
        <span className={`portal-printer-status-dot ${config.dotClass}`} aria-hidden="true" />
        <span className="portal-printer-status-label">{config.label}</span>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="portal-printer-help-btn"
          aria-label="Printer troubleshooting help"
          aria-expanded={isOpen}
          aria-controls="printer-troubleshoot-popover"
        >
          ⓘ
        </button>
      </div>

      {isOpen && (
        <PrinterTroubleshootingPopover
          id="printer-troubleshoot-popover"
          onMouseEnter={clearTimer}
          onMouseLeave={handleMouseLeave}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
