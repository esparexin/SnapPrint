'use client';

import React from 'react';
import { getAgentDownloadUrl } from '../../src/printer-client';

interface PrinterTroubleshootingPopoverProps {
  id?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

export function PrinterTroubleshootingPopover({
  id = 'printer-troubleshoot-popover',
  onMouseEnter,
  onMouseLeave,
  onClose,
}: PrinterTroubleshootingPopoverProps) {
  const downloadUrl = getAgentDownloadUrl();

  return (
    <div
      id={id}
      role="tooltip"
      aria-label="Printer troubleshooting instructions"
      className="portal-troubleshoot-popover"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="portal-troubleshoot-header">
        <strong>Printer Offline?</strong>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close troubleshooting help"
            className="portal-troubleshoot-close"
          >
            ✕
          </button>
        )}
      </div>

      <ol className="portal-troubleshoot-steps">
        <li>Check whether the printer is powered ON.</li>
        <li>Check whether the printer cable is properly connected.</li>
        <li>Make sure the printer is connected to the shop computer.</li>
        <li>
          If the printer is powered ON and the cable is properly connected, download and install the
          SnapPrint Windows Print Agent, then pair the PC Agent with your shop.
        </li>
      </ol>

      <div style={{ margin: '8px 0 10px' }}>
        <a
          href={downloadUrl}
          download="SnapPrint-Print-Agent.msi"
          target="_blank"
          rel="noopener noreferrer"
          className="portal-troubleshoot-download-btn"
        >
          📥 Download Agent (.msi)
        </a>
      </div>

      <p className="portal-troubleshoot-support-text">
        If the printer is powered ON, the cable is connected correctly, and the agent is installed
        and paired, but the printer still remains Offline, contact immediate support:
      </p>

      <a href="tel:9030787819" className="portal-troubleshoot-phone">
        📞 9030787819
      </a>
    </div>
  );
}
