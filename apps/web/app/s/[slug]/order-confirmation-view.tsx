'use client';

import React, { useState } from 'react';
import { OrderRecord, PublicPaymentSettings } from '@snapprint/contracts';
import { CustomerPaymentCard } from './customer-payment-card';

const styles = {
  card: {
    padding: '32px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #bbf7d0',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  orderBox: {
    display: 'inline-block',
    padding: '16px 32px',
    backgroundColor: '#f0fdf4',
    border: '2px dashed #86efac',
    borderRadius: '12px',
    marginBottom: '24px',
  } as React.CSSProperties,
  manifest: {
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  counterPickup: {
    padding: '14px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1e40af',
    marginBottom: '24px',
    lineHeight: 1.5,
  } as React.CSSProperties,
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '6px',
  } as React.CSSProperties,
  btn: {
    padding: '10px 20px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
};

function formatItemSummary(i: OrderRecord['items'][number]): string {
  return `(${i.paperSize.toUpperCase()}, ${i.colorMode === 'color' ? 'Color' : 'B&W'}, ${i.sides === 'double_sided' ? 'Duplex' : 'Single-sided'}, ${i.sheetsCount} sheets × ${i.copies})`;
}

interface OrderConfirmationViewProps {
  order: OrderRecord;
  studioName: string;
  slug?: string;
  sessionToken?: string;
  payment?: PublicPaymentSettings;
  onNewOrder: () => void;
}

export function OrderConfirmationView({
  order: initialOrder,
  studioName,
  slug,
  sessionToken,
  payment,
  onNewOrder,
}: OrderConfirmationViewProps) {
  const [order, setOrder] = useState<OrderRecord>(initialOrder);

  return (
    <div style={styles.card}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        Print Job Submitted Successfully!
      </h2>
      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
        Your documents have been received by <strong>{studioName}</strong>.
      </p>

      {/* Order Reference Box */}
      <div style={styles.orderBox}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', letterSpacing: '1px' }}>
          YOUR ORDER NUMBER
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
          {order.orderNumber}
        </div>
        <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
          Status: <strong>Submitted ({order.status})</strong>
        </div>
      </div>

      {/* Payment Action Card */}
      {slug && (
        <CustomerPaymentCard
          order={order}
          slug={slug}
          sessionToken={sessionToken}
          payment={payment}
          onPaymentSuccess={() => {
            setOrder((prev) => ({
              ...prev,
              paymentStatus: 'PAID',
              paidAmountMinor: prev.totalAmountMinor,
            }));
          }}
        />
      )}

      {/* Manifest Summary */}
      <div style={styles.manifest}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
          Print Settings Manifest:
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={styles.itemRow}>
              <div
                style={{ minWidth: 0, flex: 1, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.filename}</span>
                <span style={{ color: '#64748b', marginLeft: '6px' }}>
                  {formatItemSummary(item)}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>
                ₹{(item.subtotalMinor / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '8px',
            fontWeight: 800,
            fontSize: '15px',
            color: '#0f172a',
          }}
        >
          <span>Total Amount:</span>
          <span style={{ color: '#0284c7' }}>₹{(order.totalAmountMinor / 100).toFixed(2)}</span>
        </div>
      </div>

      <div style={styles.counterPickup}>
        📍 <strong>Counter Pickup:</strong> Please show Order <strong>{order.orderNumber}</strong>{' '}
        at the shop counter. The operator will print and package your documents.
      </div>

      <button type="button" onClick={onNewOrder} style={styles.btn}>
        ➕ Print Another Document
      </button>
    </div>
  );
}
