'use client';

import React from 'react';

interface OrderFulfillmentHeaderProps {
  studioName: string;
  orderCount: number;
  loading: boolean;
  onRefresh: () => void;
  onClose?: () => void;
}

export function OrderFulfillmentHeader({
  studioName,
  orderCount,
  loading,
  onRefresh,
  onClose,
}: OrderFulfillmentHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <h3
          id="order-fulfillment-title"
          style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}
        >
          Xerox & Print Fulfillment Queue
        </h3>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {studioName} · {orderCount} Active Orders
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          🔄 Refresh
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="dialog-close-btn">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
