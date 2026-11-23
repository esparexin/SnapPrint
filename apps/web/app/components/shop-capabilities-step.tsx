'use client';

import React, { useState } from 'react';
import { ShopCapabilitiesConfig } from '@snapprint/contracts';
import {
  StudioApiError,
  StudioOnboardingProfile,
  updateStudioProfile,
} from '../../src/studio-client';

type PaperSize = 'A4' | 'A3' | 'A5' | 'legal' | 'letter';

const SIZES: { id: PaperSize; label: string }[] = [
  { id: 'A4', label: 'A4' },
  { id: 'A3', label: 'A3' },
  { id: 'A5', label: 'A5' },
  { id: 'legal', label: 'Legal' },
  { id: 'letter', label: 'Letter' },
];

interface ShopCapabilitiesStepProps {
  studioId: string;
  initialCapabilities?: ShopCapabilitiesConfig;
  onSuccess: (updatedStudio: StudioOnboardingProfile) => void;
  onBack: () => void;
}

export function ShopCapabilitiesStep({
  studioId,
  initialCapabilities,
  onSuccess,
  onBack,
}: ShopCapabilitiesStepProps) {
  const [supportsColor, setSupportsColor] = useState(initialCapabilities?.supportsColor ?? true);
  const [supportsBw, setSupportsBw] = useState(initialCapabilities?.supportsBlackAndWhite ?? true);
  const autoPrintEnabled = initialCapabilities?.isAutoPrintEnabled ?? true;
  const [autoPrintMaxPages, setAutoPrintMaxPages] = useState<number>(
    initialCapabilities?.autoPrintMaxPages ?? 30
  );
  const [paperSizes, setPaperSizes] = useState<PaperSize[]>(
    initialCapabilities?.supportedPaperSizes && initialCapabilities.supportedPaperSizes.length > 0
      ? (initialCapabilities.supportedPaperSizes as PaperSize[])
      : ['A4']
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePaperSize = (size: PaperSize) => {
    if (paperSizes.includes(size)) {
      if (paperSizes.length === 1) return; // Keep at least one
      setPaperSizes(paperSizes.filter((s) => s !== size));
    } else {
      setPaperSizes([...paperSizes, size]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supportsColor && !supportsBw) {
      setError('You must support at least Color or Black & White printing.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateStudioProfile(studioId, {
        capabilities: {
          supportsColor,
          supportsBlackAndWhite: supportsBw,
          supportedPaperSizes: paperSizes,
          isAutoPrintEnabled: autoPrintEnabled,
          autoPrintMaxPages,
        },
      });
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof StudioApiError ? err.message : 'Failed to update capabilities.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
          Print Types Supported
        </h3>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={supportsBw}
              onChange={(e) => setSupportsBw(e.target.checked)}
            />
            <span>Black & White (B/W Xerox)</span>
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={supportsColor}
              onChange={(e) => setSupportsColor(e.target.checked)}
            />
            <span>Color Printing</span>
          </label>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
          Supported Paper Sizes
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {SIZES.map((size) => (
            <label
              key={size.id}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={paperSizes.includes(size.id)}
                onChange={() => togglePaperSize(size.id)}
              />
              <span>{size.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
          Direct Auto-Print Page Threshold
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.75rem' }}>
          Print jobs with page counts within this limit can proceed straight to fulfillment. Larger
          jobs require operator confirmation at the counter to prevent accidental queue hogging.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label htmlFor="auto-print-threshold" style={{ fontWeight: 500, fontSize: '0.875rem' }}>
            Maximum Direct Pages:
          </label>
          <select
            id="auto-print-threshold"
            value={autoPrintMaxPages}
            onChange={(e) => setAutoPrintMaxPages(Number(e.target.value))}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
            }}
          >
            <option value={20}>20 Pages</option>
            <option value={30}>30 Pages (Recommended)</option>
            <option value={50}>50 Pages</option>
            <option value={100}>100 Pages</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.5rem',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.25rem',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.5rem 1.25rem',
            background: loading ? '#9ca3af' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : 'Save Capabilities & Next →'}
        </button>
      </div>
    </form>
  );
}
