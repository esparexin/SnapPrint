'use client';

import React, { useState } from 'react';
import { CustomPaperSizeSummary, OrderRecord, PublicPaymentSettings } from '@snapprint/contracts';
import { CustomerPaymentCard } from './customer-payment-card';
import { resolveFormatLabel } from './format-size-label';
import { confirmationStyles as styles } from './order-confirmation-styles';

function formatItemSummary(
  i: OrderRecord['items'][number],
  customSizes?: readonly CustomPaperSizeSummary[]
): string {
  const size = resolveFormatLabel(i.paperSize, customSizes);
  const color = i.colorMode === 'color' ? 'Color' : 'B&W';
  const sides = i.sides === 'double_sided' ? 'Duplex' : 'Single-sided';
  return `(${size}, ${color}, ${sides}, ${i.sheetsCount} sheets × ${i.copies})`;
}

interface OrderConfirmationViewProps {
  order: OrderRecord;
  studioName: string;
  slug?: string;
  sessionToken?: string;
  payment?: PublicPaymentSettings;
  customPaperSizes?: readonly CustomPaperSizeSummary[];
  onNewOrder: () => void;
}

export function OrderConfirmationView({
  order: initialOrder,
  studioName,
  slug,
  sessionToken,
  payment,
  customPaperSizes,
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
          studioName={studioName}
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
                  {formatItemSummary(item, customPaperSizes)}
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
