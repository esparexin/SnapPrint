'use client';

import React from 'react';
import { QuoteResponse } from '@snapprint/contracts';

interface OrderStickyCtaBarProps {
  quote: QuoteResponse | null;
  loadingQuote: boolean;
  submitting: boolean;
  isAcceptingOrders: boolean;
  onSubmit: () => void;
}

export function OrderStickyCtaBar({
  quote,
  loadingQuote,
  submitting,
  isAcceptingOrders,
  onSubmit,
}: OrderStickyCtaBarProps) {
  const disabled = submitting || !quote || loadingQuote || isAcceptingOrders === false;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {quote ? (
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', lineHeight: 1.2 }}>
                ₹{(quote.totalAmountMinor / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                {quote.totalSheets} total sheet{quote.totalSheets === 1 ? '' : 's'}
              </div>
            </div>
          ) : loadingQuote ? (
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Calculating Total...
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Ready to print
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          style={{
            flexShrink: 0,
            minHeight: '44px',
            padding: '10px 20px',
            backgroundColor: disabled ? '#94a3b8' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.35)',
          }}
        >
          {isAcceptingOrders === false
            ? '⚠️ Printer Offline'
            : submitting
              ? 'Submitting...'
              : loadingQuote
                ? 'Calculating...'
                : '🖨️ Print'}
        </button>
      </div>
    </div>
  );
}
