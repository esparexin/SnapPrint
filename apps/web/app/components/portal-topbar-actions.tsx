'use client';

import React from 'react';
import { getAgentDownloadUrl } from '../../src/printer-client';

interface PortalTopbarActionsProps {
  canPair?: boolean;
  isBound?: boolean;
  onPairClick?: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  hideSignOut?: boolean;
}

export function PortalTopbarActions({
  canPair = false,
  isBound = false,
  onPairClick,
  onSignOut,
  signingOut,
  hideSignOut = false,
}: PortalTopbarActionsProps) {
  return (
    <>
      <a
        href={getAgentDownloadUrl()}
        download="SnapPrint-Print-Agent.msi"
        target="_blank"
        rel="noopener noreferrer"
        className="portal-download-btn"
      >
        <span aria-hidden="true">📥</span>
        <span>Download</span>
      </a>
      {canPair && onPairClick && (
        <button type="button" onClick={onPairClick} className="portal-pair-btn">
          {isBound ? 'PC Agent Status' : '+ Pair PC Agent'}
        </button>
      )}
      {!hideSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="portal-signout-btn"
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      )}
    </>
  );
}
