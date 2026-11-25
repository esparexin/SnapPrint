'use client';

import React from 'react';
import { QuoteResponse } from '@snapprint/contracts';
import { AlertIcon, PrinterIcon } from './storefront-icons';

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
    <div className="sf-sticky-bar">
      <div className="sf-sticky-inner">
        <div style={{ minWidth: 0 }}>
          {quote ? (
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7', lineHeight: 1.2 }}>
                ₹{(quote.totalAmountMinor / 100).toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                {quote.totalSheets} total sheet{quote.totalSheets === 1 ? '' : 's'}
              </div>
            </div>
          ) : loadingQuote ? (
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
              Calculating Total...
            </span>
          ) : (
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
              Ready to print
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="sf-sticky-btn"
          style={{
            backgroundColor: disabled ? '#94a3b8' : '#0284c7',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.3)',
          }}
        >
          {isAcceptingOrders === false ? (
            <>
              <AlertIcon size={15} />
              Printer Offline
            </>
          ) : submitting ? (
            'Submitting...'
          ) : loadingQuote ? (
            'Calculating...'
          ) : (
            <>
              <PrinterIcon size={15} />
              Print
            </>
          )}
        </button>
      </div>
    </div>
  );
}
