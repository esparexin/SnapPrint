'use client';

import React, { useState } from 'react';
import { CustomPaperSize, PaperSize, Studio, StudioPrintRatesContract } from '@snapprint/contracts';
import { DEFAULT_DOCUMENT_PRINT_RATES } from '@snapprint/domain';
import { StudioPrinter } from '../../src/printer-client';
import { WorkspaceApiError, updateStudioSettings } from '../../src/workspace-client';
import { useAutoDismiss } from '../hooks/use-auto-dismiss';
import { getNoticeBoxStyle } from './operator-portal-styles';
import { ShopPrintRatesFields } from './shop-print-rates-fields';

interface PrinterPageSetupSectionProps {
  studioId: string;
  printers: StudioPrinter[];
  studio: Studio;
  customSizes?: CustomPaperSize[];
}

function deriveSupportedSizes(printers: StudioPrinter[]): PaperSize[] {
  const seen = new Set<PaperSize>();
  for (const p of printers) {
    for (const size of p.supportedPaperSizes) {
      seen.add(size);
    }
  }
  // No fallback to ['A4'] — operator must configure printer capabilities manually.
  return Array.from(seen);
}

function deriveCapabilities(printers: StudioPrinter[]) {
  return {
    supportsColor: printers.some((p) => p.isColorSupported),
    supportsBlackAndWhite: true,
  };
}

export function PrinterPageSetupSection({
  studioId,
  printers,
  studio,
  customSizes,
}: PrinterPageSetupSectionProps) {
  const supportedSizes = deriveSupportedSizes(printers);
  const { supportsColor, supportsBlackAndWhite } = deriveCapabilities(printers);
  const initialRates: StudioPrintRatesContract =
    studio.settings?.printRates || DEFAULT_DOCUMENT_PRINT_RATES;
  const [printRates, setPrintRates] = useState<StudioPrintRatesContract>(initialRates);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'saved'; text: string } | null>(null);

  useAutoDismiss(notice?.kind === 'saved' ? notice : null, () => setNotice(null));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await updateStudioSettings(studioId, { printRates });
      setNotice({ kind: 'saved', text: '✓ Print rates saved.' });
    } catch (err) {
      setNotice({
        kind: 'error',
        text: err instanceof WorkspaceApiError ? err.message : 'Failed to save print rates.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        borderTop: '2px solid #e2e8f0',
        paddingTop: '20px',
        marginTop: '8px',
      }}
    >
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          style={{ ...getNoticeBoxStyle(notice.kind), marginBottom: '12px' }}
        >
          {notice.text}
        </div>
      )}
      <form onSubmit={handleSave}>
        <ShopPrintRatesFields
          printRates={printRates}
          supportedPaperSizes={supportedSizes}
          customSizes={customSizes}
          supportsColor={supportsColor}
          supportsBlackAndWhite={supportsBlackAndWhite}
          onChange={setPrintRates}
        />
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 20px',
              minHeight: '44px',
              backgroundColor: saving ? '#9ca3af' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Print Rates'}
          </button>
        </div>
      </form>
    </div>
  );
}
