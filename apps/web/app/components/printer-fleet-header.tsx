'use client';

import React from 'react';
import {
  DEFAULT_AGENT_INSTALLER_NAME,
  getAgentDownloadUrl,
  StudioFleetAllowance,
} from '../../src/printer-client';
import { PrinterStatusBadge } from './printer-status-badge';

interface PrinterFleetHeaderProps {
  studioId: string;
  studioName?: string;
  allowance?: StudioFleetAllowance | null;
  onOpenPairing?: () => void;
  onClose?: () => void;
}

export function PrinterFleetHeader({
  studioId,
  studioName,
  allowance,
  onClose,
}: PrinterFleetHeaderProps) {
  const downloadUrl = getAgentDownloadUrl();

  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h2
            id="printer-management-title"
            style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#0f172a' }}
          >
            Hardware &amp; Printers Fleet
          </h2>
          <PrinterStatusBadge studioId={studioId} />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
          {studioName || `Studio ${studioId}`}
          {allowance ? (
            <span>
              {' '}
              · Active:{' '}
              <strong>
                {typeof allowance.maxActivePrinters === 'number'
                  ? `${allowance.activeCount}/${allowance.maxActivePrinters}`
                  : allowance.activeCount}
              </strong>{' '}
              · Standby: {allowance.registeredCount - allowance.activeCount}
            </span>
          ) : (
            ' · Capability Routing & Discovery'
          )}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href={downloadUrl}
          download={DEFAULT_AGENT_INSTALLER_NAME}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            minHeight: '44px',
            backgroundColor: '#f1f5f9',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          📥 Download Agent (.msi)
        </a>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
