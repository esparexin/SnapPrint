'use client';

import React, { useEffect, useRef } from 'react';
import { Permission } from '@snapprint/contracts';
import { getAgentDownloadUrl } from '../../src/printer-client';
import { OperatorView } from './operator-portal-header';
import { WorkspaceKpiBar } from './workspace-kpi-bar';

interface OperatorStudioHubProps {
  studioId?: string;
  activeView: OperatorView;
  can?: (permission: Permission) => boolean;
  onNavigate: (view: OperatorView) => void;
  onOpenPairing?: () => void;
}

export const SHOP_MENU_TABS: { id: OperatorView; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'printer_setup', label: 'Printer & Page Setup' },
  { id: 'qr', label: 'QR Stand' },
  { id: 'payment', label: 'Payments' },
  { id: 'profile', label: 'Settings' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'staff', label: 'Staff' },
  { id: 'setup', label: 'Setup Guide' },
];

export function OperatorStudioHub({
  studioId,
  activeView,
  onNavigate,
  onOpenPairing,
}: OperatorStudioHubProps) {
  const tabRefs = useRef<Partial<Record<OperatorView, HTMLButtonElement | null>>>({});
  const downloadUrl = getAgentDownloadUrl();

  useEffect(() => {
    const activeEl = tabRefs.current[activeView];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeView]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const lastIdx = SHOP_MENU_TABS.length - 1;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = idx === lastIdx ? 0 : idx + 1;
    else if (e.key === 'ArrowLeft') nextIdx = idx === 0 ? lastIdx : idx - 1;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = lastIdx;
    if (nextIdx === null) return;
    e.preventDefault();
    const targetTab = SHOP_MENU_TABS[nextIdx];
    onNavigate(targetTab.id);
    tabRefs.current[targetTab.id]?.focus();
  };

  return (
    <>
      {studioId && <WorkspaceKpiBar studioId={studioId} onNavigate={onNavigate} />}

      <nav aria-label="Shop Portal Menu" className="portal-menu-nav">
        <div role="tablist" aria-label="Shop Sections" className="portal-tablist">
          {SHOP_MENU_TABS.map((tab, idx) => {
            const isSelected = activeView === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`portal-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onNavigate(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className="portal-tab"
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <a
          href={downloadUrl}
          download="SnapPrint-Print-Agent.msi"
          target="_blank"
          rel="noopener noreferrer"
          className="portal-menu-action"
        >
          <span aria-hidden="true">📥</span>
          <span>Download</span>
        </a>

        {studioId && onOpenPairing && (
          <button type="button" onClick={onOpenPairing} className="portal-menu-action">
            Pair
          </button>
        )}
      </nav>
    </>
  );
}
