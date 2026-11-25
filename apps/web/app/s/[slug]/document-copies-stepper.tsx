'use client';

import React, { useId } from 'react';
import { DocumentPrintConfig } from '@snapprint/contracts';

interface DocumentCopiesStepperProps {
  config: DocumentPrintConfig;
  isSinglePage: boolean;
  onUpdate: (updated: DocumentPrintConfig) => void;
}

export function DocumentCopiesStepper({
  config,
  isSinglePage,
  onUpdate,
}: DocumentCopiesStepperProps) {
  const pagesInputId = useId();

  return (
    <div className="sf-pages-copies-row">
      <div style={{ minWidth: 0 }}>
        <label htmlFor={isSinglePage ? undefined : pagesInputId} className="sf-field-label">
          Pages
        </label>
        {isSinglePage ? (
          <div className="sf-pages-readonly" aria-label="Pages: 1 (Single page)">
            1 (Single page)
          </div>
        ) : (
          <input
            id={pagesInputId}
            type="text"
            value={config.pageSelection}
            onChange={(e) => onUpdate({ ...config, pageSelection: e.target.value })}
            placeholder="all or 1-5"
            enterKeyHint="done"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="sf-pages-input"
          />
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="sf-field-label">Copies</div>
        <div className="sf-stepper">
          <button
            type="button"
            aria-label="Decrease copies"
            disabled={config.copies <= 1}
            onClick={() => onUpdate({ ...config, copies: Math.max(1, config.copies - 1) })}
            className="sf-stepper-btn"
          >
            −
          </button>
          <span className="sf-stepper-val" aria-live="polite">
            {config.copies}
          </span>
          <button
            type="button"
            aria-label="Increase copies"
            disabled={config.copies >= 100}
            onClick={() => onUpdate({ ...config, copies: Math.min(100, config.copies + 1) })}
            className="sf-stepper-btn"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
