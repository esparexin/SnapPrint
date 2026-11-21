'use client';

import React, { useEffect, useState } from 'react';
import { DocumentPrintConfig, OrderRecord, QuoteResponse } from '@snapprint/contracts';
import { requestPrintQuote, submitPrintOrder } from '../../../src/order-client';
import { OrderItemsBreakdown } from './order-items-breakdown';

interface OrderSummaryCardProps {
  slug: string;
  sessionId: string;
  token: string;
  configs: DocumentPrintConfig[];
  onOrderSubmitted: (order: OrderRecord) => void;
}

export function OrderSummaryCard({
  slug,
  sessionId,
  token,
  configs,
  onOrderSubmitted,
}: OrderSummaryCardProps) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    let mounted = true;
    if (configs.length === 0) {
      setQuote(null);
      return;
    }

    async function loadQuote() {
      setLoadingQuote(true);
      setError(null);
      try {
        const q = await requestPrintQuote(slug, sessionId, token, configs);
        if (mounted) setQuote(q);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to calculate quote');
      } finally {
        if (mounted) setLoadingQuote(false);
      }
    }

    const timer = setTimeout(loadQuote, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [slug, sessionId, token, configs]);

  async function handleSubmitOrder() {
    if (configs.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const order = await submitPrintOrder(slug, sessionId, token, {
        idempotencyKey,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: configs,
      });
      onOrderSubmitted(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (configs.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #0284c7',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
          Print Order Quotation
        </h3>
        {loadingQuote && (
          <span style={{ fontSize: '12px', color: '#0284c7' }}>Recalculating...</span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '13px',
            marginBottom: '14px',
          }}
        >
          {error}
        </div>
      )}

      {quote && (
        <div style={{ marginBottom: '16px' }}>
          <OrderItemsBreakdown items={quote.items} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '2px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                Total Estimated Amount:
              </span>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {quote.totalSheets} total printed sheets
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>
              ₹{(quote.totalAmountMinor / 100).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Counter Pickup Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          margin: '16px 0',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Customer Name (Optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="For counter call"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '4px',
            }}
          >
            Mobile Number (Optional)
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="10-digit mobile"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmitOrder}
        disabled={submitting || !quote}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: submitting || !quote ? '#94a3b8' : '#0284c7',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: submitting || !quote ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {submitting ? 'Submitting Order...' : '🚀 Submit Document Print Job'}
      </button>
    </div>
  );
}
