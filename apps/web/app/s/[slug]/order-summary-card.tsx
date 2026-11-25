'use client';

import React, { useEffect, useState } from 'react';
import { DocumentPrintConfig, OrderRecord, QuoteResponse } from '@snapprint/contracts';
import { OrderApiError, requestPrintQuote, submitPrintOrder } from '../../../src/order-client';
import { hasInvalidPageSelection } from './document-print-workflow-helpers';
import { OrderCustomerForm } from './order-customer-form';
import { OrderItemsBreakdown } from './order-items-breakdown';
import { OrderStickyCtaBar } from './order-sticky-cta-bar';

interface OrderSummaryCardProps {
  slug: string;
  sessionId: string;
  token: string;
  configs: DocumentPrintConfig[];
  onOrderSubmitted: (order: OrderRecord) => void;
  isAcceptingOrders?: boolean;
}

export function OrderSummaryCard({
  slug,
  sessionId,
  token,
  configs,
  onOrderSubmitted,
  isAcceptingOrders = true,
}: OrderSummaryCardProps) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const configHash = JSON.stringify(configs);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    if (configs.length === 0) {
      setQuote(null);
      setError(null);
      setLoadingQuote(false);
      return;
    }
    if (hasInvalidPageSelection(configs)) {
      setQuote(null);
      setLoadingQuote(false);
      setError('Please enter a valid page selection (e.g. all or 1-5).');
      return;
    }

    async function loadQuote() {
      setLoadingQuote(true);
      setError(null);
      try {
        const q = await requestPrintQuote(slug, sessionId, token, configs, controller.signal);
        if (mounted) setQuote(q);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (mounted) {
          setQuote(null);
          setError(err instanceof Error ? err.message : 'Failed to calculate quote');
        }
      } finally {
        if (mounted && !controller.signal.aborted) setLoadingQuote(false);
      }
    }

    const timer = setTimeout(loadQuote, 250);
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, sessionId, token, configHash]);

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
      if (err instanceof OrderApiError) {
        if (err.code === 'AGENT_OFFLINE' || err.code === 'NO_ACTIVE_PRINTER') {
          setError(
            'This shop is currently unable to accept new print orders because printing hardware is offline. Please try again shortly.'
          );
        } else if (err.code === 'SUBSCRIPTION_EXPIRED') {
          setError(
            'This shop is currently unable to accept new print orders because the subscription has expired. Please contact the shop owner.'
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Order submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (configs.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #0284c7',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          Print Order
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
            marginBottom: '12px',
          }}
        >
          {error}
        </div>
      )}

      {quote && (
        <div style={{ marginBottom: '14px' }}>
          <OrderItemsBreakdown items={quote.items} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '2px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Total Estimated Amount:
              </span>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {quote.totalSheets} total printed sheets
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7' }}>
              ₹{(quote.totalAmountMinor / 100).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      <OrderCustomerForm
        customerName={customerName}
        customerPhone={customerPhone}
        onChangeName={setCustomerName}
        onChangePhone={setCustomerPhone}
      />

      <OrderStickyCtaBar
        quote={quote}
        loadingQuote={loadingQuote}
        submitting={submitting}
        isAcceptingOrders={isAcceptingOrders}
        onSubmit={handleSubmitOrder}
      />
      <div style={{ height: '70px' }} aria-hidden="true" />
    </div>
  );
}
